# Performance Optimizations

Questo documento mappa le chiamate DB attuali e propone una strategia di ottimizzazione focalizzata sui tempi di apertura di `/` e `/statistics`.

## 1) Chiamate DB per pagina

Nota importante: tutte le pagine autenticate eseguono anche il load globale di `src/routes/+layout.server.ts`.

### Chiamate globali (`+layout.server.ts`, su ogni pagina autenticata)

1. `user_roles`:
   - `select role where user_id = ?` (via `getUserRole`)
2. `costs_notifications`:
   - `select * where user_id = ? order by created_at desc limit 20`

### `/` (`src/routes/+page.server.ts`)

Chiamate specifiche della pagina:

1. `costs_spaces_connections`:
   - verifica membership utente su `active_space_id`
2. `costs_spaces`:
   - lettura metadati spazio attivo (nome, currency, format, colori, target)
3. `costs_categories`:
   - categorie dello spazio (`order by name`)
4. `costs_movements` (via `scanAvailableYears`):
   - query 1: ultimo movimento (`order by date desc limit 1`)
   - query 2: primo movimento (`order by date asc limit 1`)
5. `costs_spaces_connections` + `auth.admin.getUserById` (solo con service role):
   - elenco membri dello spazio
   - una chiamata admin auth per ogni membro (N+1)
6. `costs_movements` + join `costs_categories`:
   - lista movimenti filtrata
   - include `count: 'exact'`
   - filtri possibili: intervallo date, categorie, tipo categoria, `ilike` su description, `contains` su tags
   - paginazione server (`range(0, limit - 1)`, default 20)

### `/statistics` (`src/routes/statistics/+page.server.ts`)

Chiamate specifiche della pagina:

1. `costs_spaces_connections`:
   - verifica membership utente su `active_space_id`
2. `costs_spaces`:
   - configurazione valuta/formato/colori/target
3. `costs_categories`:
   - categorie dello spazio (`order by name`)
4. `costs_movements` (via `scanAvailableYears`):
   - query 1: ultimo movimento (`order by date desc limit 1`)
   - query 2: primo movimento (`order by date asc limit 1`)
5. `costs_movements` + join `costs_categories`:
   - fetch dataset statistico fino a 5000 righe (`MAX_STATS_ROWS`)
   - ordinato ascendente per data
   - filtri possibili: intervallo date, categorie, tipo, `ilike` description, `contains` tags

### `/spaces` (`src/routes/spaces/+page.server.ts`)

1. `costs_spaces_connections`: elenco `space_id` dell'utente
2. `costs_spaces`: dettaglio spazi con `where id in (...) order by created_at desc`

### `/spaces/[id]` (`src/routes/spaces/[id]/+page.server.ts`)

1. `costs_spaces_connections`: verifica accesso spazio
2. `costs_spaces`: dettaglio spazio
3. `costs_categories`: categorie dello spazio
4. `costs_spaces_connections`: membri dello spazio (admin client)
5. `auth.admin.getUserById` per ogni membro (N+1)
6. `costs_space_invites` (solo owner): invito attivo più recente

### `/spaces/join/[token]` (`src/routes/spaces/join/[token]/+page.server.ts`)

1. `costs_space_invites`: validazione token invito
2. `costs_spaces_connections`: verifica membership già esistente
3. `costs_spaces_connections`: eventuale insert membership

### `/admin` (`src/routes/admin/+page.server.ts`)

Nessuna query aggiuntiva in `+page.server.ts`; usa `parent()` che eredita i dati del layout.

### `/login` (`src/routes/login/+page.server.ts`)

Nessuna query su tabelle applicative nel load (solo auth nelle actions).

## 2) Probabili colli di bottiglia

Di seguito i problemi che hanno impatto diretto su TTFB e tempo totale di rendering, soprattutto su `/` e `/statistics`.

1. Query ridondanti su ogni apertura pagina
   - Ogni pagina autenticata esegue sempre `user_roles` e `costs_notifications` da layout.
   - `/` e `/statistics` aggiungono diverse query in cascata sullo stesso spazio (membership, spazio, categorie, anni, movimenti).

2. `count: 'exact'` su `costs_movements` in homepage
   - Il count esatto su dataset grandi e filtrati può diventare molto costoso.
   - Spesso è la parte più lenta quando i movimenti crescono.

3. Download di molte righe grezze in `/statistics`
   - Fino a 5000 righe con join categorie, poi aggregazione lato applicazione.
   - La pagina paga sia costo DB che payload di rete che costo CPU server/client.

4. Filtri testuali e array su tabella grande
   - `ilike('%...%')` su description e `contains(tags, [...])` possono degradare rapidamente senza indici adeguati.
   - Anche con indici, l'efficacia dipende dalla selettivita dei filtri.

5. Pattern N+1 per risoluzione membri
   - In `/` e `/spaces/[id]` viene fatta una chiamata `auth.admin.getUserById` per ogni membro spazio.
   - All'aumentare dei membri, la latenza cresce linearmente.

6. `scanAvailableYears` eseguito in piu pagine
   - Anche se ottimizzato a 2 query, rimane costo ripetuto (homepage/statistics).
   - Il cache in-memory aiuta, ma non elimina cold-start e multi-instance.

7. Join runtime su movimenti + categorie per ogni richiesta
   - Join ripetuto su query dinamiche ad alto volume.
   - Su `/statistics` il costo cresce perche la cardinalita e piu alta.

## 3) Viste da creare per risolvere la situazione

Obiettivo: spostare dal runtime applicativo al DB la parte ripetitiva e aggregata, riducendo query count, payload e costo CPU.

### Vista A: `costs_v_space_context`

Scopo:
- Restituire in una singola lettura il contesto dello spazio: metadati spazio, preferenze visual, eventuali info utente-spazio utili al load.

Contenuto suggerito:
- `space_id`, `name`, `currency`, `format`
- `color_needs`, `color_wants`, `color_savings`
- `target_needs`, `target_wants`, `target_savings`

Beneficio:
- Riduce roundtrip separati su `costs_spaces` e semplifica il load di `/` e `/statistics`.

### Vista B: `costs_v_movements_enriched`

Scopo:
- Materializzare il join ricorrente movimenti-categorie in una vista unica interrogabile sia da `/` sia da `/statistics`.

Contenuto suggerito:
- campi movimento: `id`, `space_id`, `date`, `amount`, `description`, `tags`, `user_id`, `expense_user_id`
- campi categoria: `category_id`, `category_name`, `category_type`
- campi derivati: `year`, `month`, `signed_amount` (es. positivo per income, negativo per expense)

Beneficio:
- Query applicative piu semplici
- Minore complessita runtime
- Base comune per statistiche e filtri

### Vista C (materialized): `costs_mv_statistics_monthly`

Scopo:
- Pre-aggregare i dati statistici per spazio/anno/mese/tipo/categoria evitando fetch di migliaia di righe raw.

Contenuto suggerito:
- chiavi: `space_id`, `year`, `month`, `category_id`, `category_type`
- metriche: `total_amount`, `movements_count`

Uso:
- `/statistics` legge direttamente aggregati gia pronti.
- refresh schedulato (cron) o refresh incrementale post-insert/update su movimenti.

Beneficio:
- Drastica riduzione di latenza e payload sulla pagina statistiche.

### Vista D: `costs_v_available_years`

Scopo:
- Evitare il doppio accesso min/max ad ogni load.

Contenuto suggerito:
- `space_id`, `min_year`, `max_year`, `years` (array opzionale)

Beneficio:
- Unica query semplice per popolare il filtro anni su `/` e `/statistics`.

### Vista E: `costs_v_space_members`

Scopo:
- Eliminare N+1 verso `auth.admin.getUserById` usando una sorgente profilo locale (es. tabella `public.user_profiles` sincronizzata).

Contenuto suggerito:
- `space_id`, `user_id`, `display_name`, `email_fallback`

Beneficio:
- Lookup membri in una query sola.
- Riduce dipendenza da chiamate admin auth per request.

## Priorita di implementazione consigliata

1. Creare `costs_v_movements_enriched` e migrare `/` su questa vista (incluso rimozione o riduzione `count exact` dove possibile).
2. Introdurre `costs_mv_statistics_monthly` e far leggere `/statistics` dagli aggregati.
3. Introdurre `costs_v_space_members` (con `user_profiles`) per eliminare N+1 membri.
4. Introdurre `costs_v_available_years` per semplificare filtro anni.
5. Valutare caching query risultato breve (30-60s) anche per dati notifiche/ruolo se accettabile.

## Nota pratica su indici (complementare alle viste)

Le viste da sole non bastano se gli indici sono assenti. In parallelo, verificare almeno:

1. `costs_movements(space_id, date desc)`
2. `costs_movements(space_id, category_id, date)`
3. indice GIN su `costs_movements(tags)`
4. indice trigram su `costs_movements(description)` se il filtro `ilike` deve restare

Questi indici migliorano direttamente le query dei load anche prima della migrazione completa a viste/materialized view.