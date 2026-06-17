# Piano — Accesso al BOT "dav1d3"

Documento di analisi e decisione per integrare un bot esterno (basato su API Anthropic)
che legge uno scontrino, lo categorizza e **inserisce il movimento risultante in
costs-tracker-v2**.

## Obiettivi

1. Il bot può inserire movimenti nell'app tramite un canale dedicato.
2. Quando il bot inserisce un movimento, il **sistema di notifiche esistente scatta**
   esattamente come se fosse un'altra persona del gruppo (notifica in-app + web push agli
   altri membri).
3. Il bot **compare nella lista membri dello spazio** ed è trattato come un membro
   ulteriore (visibile, rimovibile, attribuibile nei movimenti e nelle notifiche).

## Vincoli / decisioni già prese

- **Auth dell'endpoint**: API key statica (header `Authorization: Bearer <key>`).
- **Contenuti e categorie**: gestiti interamente nel bot. L'app riceve dati **già
  coerenti** e si limita a validarli contro il DB (es. `category_id` deve appartenere allo
  spazio). Nessuna interpretazione di contenuti lato app.

---

## 1. Come funziona oggi (stato attuale)

### Inserimento movimenti e notifiche

- I movimenti vengono creati nell'action `createMovement` di
  [src/routes/+page.server.ts](../src/routes/+page.server.ts#L369) usando l'**admin client**
  (service role, bypassa RLS) — vedi [src/lib/server/auth.ts](../src/lib/server/auth.ts#L10).
- Dopo l'insert, `dispatchCreationNotifications()`
  ([+page.server.ts:294](../src/routes/+page.server.ts#L294)):
  - inserisce una riga in `costs_notifications` **per ogni altro membro dello spazio**
    (`.neq('user_id', actor)`, [riga 320](../src/routes/+page.server.ts#L320));
  - invia la web push via `sendPushToUsers()`
    ([src/lib/server/push.ts](../src/lib/server/push.ts#L43)).
  - È **fire-and-forget**: non blocca mai la risposta.
- L'attore della notifica è identificato da `actor_id` (FK → `auth.users`) e `actor_name`
  (testo libero, derivato dai metadata utente). Schema in
  [docs/query-creazione-db.sql:100](query-creazione-db.sql#L100).
- L'appartenenza a uno spazio è una riga in
  `costs_spaces_connections (space_id, user_id)`
  ([schema riga 19](query-creazione-db.sql#L19)); `user_id` → `user_roles.user_id` →
  `auth.users`.
- `costs_movements.user_id` ha FK → `user_roles(user_id)`; `actor_id`/`user_id` delle
  notifiche hanno FK → `auth.users(id)`.

### Lista membri dello spazio

In [src/routes/spaces/[id]/+page.server.ts:64-103](../src/routes/spaces/%5Bid%5D/+page.server.ts#L64-L103)
la lista membri è costruita:

1. iterando le righe di `costs_spaces_connections` dello spazio, e
2. risolvendo l'**email** di ciascun `user_id` via `admin.auth.admin.getUserById()`.

La lista modificabile (`members`) è mostrata solo all'owner; la mappa `membersMap`
(id → email) serve anche per attribuire i movimenti nella UI. L'action `removeMember`
([riga 287](../src/routes/spaces/%5Bid%5D/+page.server.ts#L287)) consente all'owner di
rimuovere qualsiasi membro che non sia l'owner.

### Conseguenze chiave

- **Notifiche**: se il bot è un membro con un proprio `user_id`, la catena di notifiche
  esistente lo tratta automaticamente come "un'altra persona" — gli altri membri (tu)
  ricevono notifica + push, e il bot non notifica se stesso. **Non serve toccare la logica
  di notifica**: basta dargli un'identità e un canale d'ingresso.
- **Lista membri**: perché il bot vi compaia servono (a) una riga in
  `costs_spaces_connections` per lo spazio e (b) un **auth user reale con email** (la lista
  mostra l'email risolta via `getUserById`). Solo l'Opzione A più sotto soddisfa entrambe.

---

## 2. Identità del bot — opzioni

### Utente Supabase reale ✅

- Si crea un vero auth user per il bot (dashboard Supabase o admin API) con un'email
  riconoscibile (es. `dav1d3@bot.costs.local`), una riga `user_roles` (ruolo `user` o un
  nuovo ruolo `bot`) e una riga `costs_spaces_connections` per lo spazio target.
- `user_metadata.full_name = "dav1d3"` così l'`actor_name` delle notifiche è già pulito.
- **Lista membri**: il bot compare automaticamente (la lista itera le connections e mostra
  la sua email); l'owner può rimuoverlo come ogni membro via `removeMember`.
- **Pro**: zero modifiche allo schema; FK soddisfatte; notifiche + push funzionano
  "gratis"; il bot è un membro reale a tutti gli effetti (lista + `members_map`).
- **Contro**: serve un provisioning manuale una tantum dell'utente e della membership.
- *Rifinitura UI opzionale*: oggi la lista mostra l'email; volendo si può mostrare il
  `full_name` e/o un badge "bot". Non necessario per il requisito.

---

## 3. Canale d'ingresso — endpoint API + Bearer token *(scelto)*

Un nuovo endpoint SvelteKit `POST /api/movements` protetto da un Bearer token statico,
che riusa lo **stesso identico path** di insert + notifiche del form dell'app.

Alternative considerate e scartate:

- *Login Supabase + chiamata alla form action*: fragile (form-encoded + cookie + redirect,
  non pensata per machine-to-machine).
- *Service role key nel progetto esterno con scrittura diretta su DB*: espone il service
  role fuori dall'app e duplica la logica di push/notifiche.
- *Trigger DB su INSERT in `costs_movements`* (lungo periodo): robusto per le notifiche
  in-app, ma le **web push** richiedono comunque Node/web-push (non fattibili da Postgres
  senza `pg_net` + edge function). Più semplice tenere la logica a livello app.

### Contratto `POST /api/movements`

- **Header**: `Authorization: Bearer <BOT_API_KEY>`, `Content-Type: application/json`.
- **Body (JSON)** — dati già coerenti, prodotti dal bot:

  | Campo | Tipo | Note |
  |-------|------|------|
  | `space_id` | uuid | Validato: il bot deve essere membro di quello spazio |
  | `category_id` | uuid | Validato: deve appartenere a `space_id` |
  | `amount` | number > 0 | Il segno lo applica il server via `resolveCategorySign()` ([movements.ts:44](../src/lib/server/movements.ts#L44)) |
  | `date` | `YYYY-MM-DD` | |
  | `description` | string? | opzionale |
  | `expense_user_id` | uuid? | opzionale |
  | `tags` | string[]? | opzionale |
  | `invert_sign` | bool? | opzionale (refund/correzioni) |
  | `recurring` | bool? | opzionale (stessa espansione mensile dell'action) |

- **Validazioni** (→ `400` se falliscono): token valido, `space_id` esistente e bot
  membro, `category_id` appartiene allo spazio, `amount > 0`, `date` valida.
- **Effetti**: insert via admin client → `dispatchCreationNotifications` con attore = bot
  → notifica in-app + push agli altri membri (te). Identico al form.
- **Risposta**: `200 { ok: true, movementId }` oppure errore JSON (`401`/`400`/`500`).

### Endpoint di supporto opzionale

Per evitare di hardcodare gli ID nel bot: un `GET /api/categories?space_id=` (stesso
Bearer) che restituisce `[{ id, name, type }]` dello spazio. Opzionale — da decidere in
fase di implementazione.

---

## 4. Implementazione (quando si procederà)

### File

- **Nuovo** `src/routes/api/movements/+server.ts` — endpoint POST + auth Bearer +
  validazioni.
- `src/lib/server/movements.ts` — nuova `createMovementForActor()` + spostamento qui di
  `dispatchCreationNotifications` (oggi in `+page.server.ts`), così action del form ed
  endpoint del bot condividono lo stesso core senza duplicazione.
- `src/routes/+page.server.ts` — l'action `createMovement` chiama la funzione condivisa.
- *(Opzionale)* `src/routes/spaces/[id]/+page.svelte` — mostrare `full_name`/badge "bot"
  nella lista invece della sola email.

### Env

```
BOT_API_KEY        # secret condiviso col bot, header Authorization: Bearer
# eventuali, solo se si sceglie un'identità non basata sui metadata utente:
# BOT_USER_ID
# BOT_DISPLAY_NAME
```

### Provisioning Supabase (Opzione A)

1. Creare l'auth user del bot (email riconoscibile + `user_metadata.full_name = "dav1d3"`).
2. Inserire la riga in `user_roles` per il suo `user_id`.
3. Inserire la riga in `costs_spaces_connections` per lo spazio target → il bot compare in
   lista membri.
4. Documentare i passi anche in [docs/query-creazione-db.sql](query-creazione-db.sql).

---

## 5. Verifica (a implementazione avvenuta)

- `POST /api/movements` con Bearer valido inserisce il movimento e ritorna `movementId`.
- Senza/with Bearer errato → `401`; con `category_id` non dello spazio o `amount <= 0` →
  `400`.
- Dopo l'insert del bot: l'utente reale riceve la notifica in-app **e** la web push.
- Il bot compare nella lista membri dello spazio e l'owner può rimuoverlo.
