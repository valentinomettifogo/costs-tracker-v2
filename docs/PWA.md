# PWA Architecture

## Overview

L'app è una Progressive Web App installabile su iOS (e Android) tramite "Aggiungi a schermata Home". Il Service Worker è gestito nativamente da SvelteKit (`src/service-worker.ts`) senza dipendenze aggiuntive.

---

## File presenti (pre-Phase 1)

| File | Scopo |
|------|-------|
| `static/site.webmanifest` | Manifest PWA: nome, icone, tema, display mode |
| `static/icons/apple-touch-icon.png` | Icona 180×180px per iOS "Aggiungi a schermata Home" |
| `static/icons/web-app-manifest-192x192.png` | Icona 192×192px per Android e manifest |
| `static/icons/web-app-manifest-512x512.png` | Icona 512×512px per Android (usata anche come maskable) |
| `src/app.html` | `<link rel="manifest">`, `theme-color`, `apple-touch-icon` |

---

## Phase 1 — Installabilità iOS (completata)

### File modificati

**`src/app.html`**
- Aggiunto `viewport-fit=cover` al viewport (necessario per `pb-safe`/`pt-safe` con il notch)
- Aggiunto `apple-mobile-web-app-capable` → attiva la modalità standalone su iOS
- Aggiunto `apple-mobile-web-app-status-bar-style: black-translucent` → status bar trasparente, il contenuto passa sotto (funziona con `pt-safe`)
- Aggiunto `apple-mobile-web-app-title: Budget` → nome mostrato sotto l'icona sulla Home

**`static/site.webmanifest`**
- Aggiunto `"id": "/"` → identifica univocamente l'installazione
- Aggiunto `"scope": "/"` → perimetro della PWA
- Aggiunta entry icona `web-app-manifest-512x512.png` con `"purpose": "maskable"` → icone adaptive Android

### File aggiunti

**`src/service-worker.ts`**
- Service worker nativo SvelteKit (compilato automaticamente al build)
- `install`: precache di tutti gli asset statici e del bundle, con versioning tramite `CACHE_NAME = budget-cache-${version}`
- `activate`: eliminazione delle cache di versioni precedenti + `clients.claim()`
- `fetch`: 
  - **Cache-first** per asset statici (build output + `static/`)
  - **Network-first** per navigazione (fetch → fallback cache)
  - **Bypass** per chiamate API esterne (Supabase) e route SvelteKit interne

---

## Phase 2 — Push Notifications (da implementare)

### Prerequisiti

- [ ] Generare una coppia di chiavi VAPID (`npx web-push generate-vapid-keys`)
- [ ] Aggiungere `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` alle variabili d'ambiente (`.env` + deployment)
- [ ] Installare `web-push` (`npm i web-push`) per inviare notifiche lato server

### File da aggiungere/modificare

| File | Azione | Scopo |
|------|--------|-------|
| `src/service-worker.ts` | Decommentare `push` + `notificationclick` handler | Ricevere e mostrare la notifica, gestire il tap |
| `src/routes/push-subscribe/+server.ts` | Nuovo | Endpoint `POST` per salvare la subscription (endpoint, p256dh, auth) su Supabase |
| `src/routes/push-subscribe/+server.ts` | Nuovo | Endpoint `DELETE` per cancellare la subscription |
| `src/lib/components/PushPermissionPrompt.svelte` | Nuovo | UI che chiede il permesso notifiche all'utente (dopo un'azione significativa, non all'avvio) |
| `src/lib/server/push.ts` | Nuovo | Helper lato server per inviare notifiche tramite `web-push` |
| `docs/query-creazione-db.sql` | Modifica | Aggiungere tabella `push_subscriptions` (user_id, endpoint, p256dh, auth, created_at) |

### Schema DB suggerito

```sql
create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz default now()
);
alter table push_subscriptions enable row level security;
create policy "Users manage own subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id);
```

### Note iOS

- Le push notification via Service Worker sono supportate su iOS **solo da iOS 16.4+** e **solo se l'app è installata** dalla Home Screen (non funzionano in Safari normale)
- L'utente deve prima aggiungere l'app alla Home, poi concedere il permesso dall'interno dell'app installata

---

## Testing

### Phase 1
1. `npm run build && npm run preview`
2. Chrome DevTools → Application → Service Workers: stato "activated and running"
3. Chrome DevTools → Application → Manifest: nessun warning
4. Lighthouse → PWA audit: tutte le check di installabilità verdi
5. iOS Safari → Share → "Aggiungi a schermata Home" → icona corretta, apertura in standalone (senza barra Safari)

### Phase 2
1. Testare su iOS 16.4+ con app aggiunta alla Home
2. Verificare che la subscription venga salvata su Supabase
3. Inviare una notifica di test con `web-push` da script locale
