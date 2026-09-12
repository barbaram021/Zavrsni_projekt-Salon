# Deploy frontenda na Render

Frontend se deploya kao **Static Site** (samo statične datoteke, bez Node servera).

Backend je već na `https://salon-backend-om75.onrender.com`.

---

## Varijanta A — Blueprint (automatski)

U repozitoriju je `render.yaml` u korijenu. U Render dashboardu:

**New → Blueprint → odaberi repo `barbaram021/Zavrsni_projekt-Salon` → Apply**

Render pročita `render.yaml` i sam podesi sve što je opisano dolje.
Postojeći backend servis ostaje netaknut jer nije u blueprintu.

---

## Varijanta B — ručno kroz dashboard

**New → Static Site → poveži repo**, pa upiši:

| Polje | Vrijednost |
|---|---|
| Name | `salon-frontend` |
| Branch | `main` |
| Root Directory | `Frontend/salon-app` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist/salon-app/browser` |

### Obavezno: Rewrite za Angular routing

Nakon kreiranja servisa idi na **Settings → Redirects/Rewrites → Add Rule**:

| Source | Destination | Action |
|---|---|---|
| `/*` | `/index.html` | Rewrite |

Bez ovog pravila aplikacija radi samo s početne stranice. Čim korisnik
osvježi stranicu na `/admin`, `/rezervacija` ili `/prijava`, Render traži
datoteku tog imena na disku, ne nađe je i vrati **404**. Angular router
radi na klijentu, pa server mora na svaki nepoznati put vratiti `index.html`.

### Environment varijabla

| Key | Value |
|---|---|
| `NODE_VERSION` | `24.13.0` |

---

## Kako je konfiguriran API URL

`src/environments/environment.ts` (lokalni razvoj):

```ts
apiUrl: 'http://127.0.0.1:8000'
```

`src/environments/environment.production.ts` (Render):

```ts
apiUrl: 'https://salon-backend-om75.onrender.com'
```

Zamjenu radi `fileReplacements` u `angular.json`, u `production`
konfiguraciji. `npm run build` podrazumijevano koristi `production`
(`defaultConfiguration: "production"`), pa je produkcijski URL automatski
ugrađen u build. `npm start` i dalje gađa lokalni backend.

**Ako se backend URL promijeni, mijenja se samo `environment.production.ts`.**

Provjera da je URL stvarno ušao u build:

```bash
npm run build
grep -rl "salon-backend-om75" dist/        # mora naći pogodak
grep -rl "127.0.0.1" dist/                 # ne smije naći ništa
```

---

## CORS

Backend u `Salon/Backend/main.py` ima `allow_origins=["*"]`, pa frontend
radi s bilo koje domene bez dodatnog podešavanja.

Ako želiš stegnuti pristup samo na svoj frontend, zamijeni u `main.py`:

```python
allow_origins=["https://salon-frontend.onrender.com"],
```

---

## Napomena o free planu

Backend na free planu se gasi nakon ~15 minuta neaktivnosti. Prvi zahtjev
nakon toga čeka 30–60 sekundi dok se servis ne probudi — prijava će
djelovati kao da se zaglavila. Static Site se ne gasi.

Prije prezentacije otvori backend da ga probudiš:
`https://salon-backend-om75.onrender.com/health/db`
