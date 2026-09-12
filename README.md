# Kozmetički salon - rezervacije

Web aplikacija za vođenje kozmetičkog salona: klijenti online rezerviraju termin
kod odabranog radnika, radnici vide svoj raspored, a administrator upravlja
uslugama, radnicima i rasporedom.

Završni projekt - FastAPI (REST API) + PostgreSQL + Angular.

| | |
|---|---|
| Frontend | https://salon-frontend-kfma.onrender.com |
| API dokumentacija | https://salon-backend-om75.onrender.com/docs |


## Tehnologije

**Backend**

| Python | 3.14
| FastAPI | 0.139.2
| PostgreSQL | 16+

**Frontend**


| Angular | 21 
| TypeScript | 5.9
| Tailwind CSS | 4.3

---


## Pokretanje

Preduvjeti: **Python 3.14**, **PostgreSQL 16+**, **Node.js 20.19+**.

```bash
git clone https://github.com/barbaram021/Zavrsni_projekt-Salon.git
cd Zavrsni_projekt-Salon
```

### 1. Baza podataka

Kreiraj praznu bazu:

```bash
psql -U postgres -c "CREATE DATABASE salon;"
```

Pokreni SQL skriptu koja stvara tipove, tablice i indeks:

```bash
psql -U postgres -d salon -f Salon/Backend/db/baza_salon.sql
```

### 2. Datoteka .env

Backend čita konfiguraciju iz `Salon/Backend/.env`. Predložak je u
`Salon/Backend/.env.example`:

| `POSTGRES_*` | podaci za spajanje na bazu |
| `SECRET_KEY` | ključ za potpisivanje JWT tokena |
| `ALGORITHM` | algoritam potpisa (`HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | trajanje prijave u minutama |
| `REZERVACIJA_ROK_POTVRDE_MINUTA` | koliko klijent ima vremena potvrditi termin |

### 3. Backend

Kreiraj virtualno okruženje:

```bash
python -m venv Salon
```

```bash
Salon\Scripts\activate
```

```bash
pip install -r Salon/requirements.txt
```

```bash
cd Salon/Backend
uvicorn main:app --reload
```

`uvicorn` se mora pokrenuti baš iz `Salon/Backend`. Importi u kodu su apsolutni.

API je dostupan na `http://127.0.0.1:8000`:

- Swagger UI — http://127.0.0.1:8000/docs
- ReDoc — http://127.0.0.1:8000/redoc
- Provjera baze — http://127.0.0.1:8000/health/db

### 4. Administrator

Registracija preko `/auth/register` uvijek stvara klijenta, a radnika može
kreirati samo administrator. Prvog administratora zato treba unijeti izravno u
bazu.

### 5. Frontend

```bash
cd Frontend/salon-app
npm install
npm start
```

Aplikacija radi na http://localhost:4200

Adresa API-ja definirana je u `src/environments/`:

```bash
npm run build
```

---
## Uloge

Uloga se sprema u tablicu `KORISNIK` (enum `ULOGA_TIP`) i zapisuje u JWT token
pri prijavi.

### KLIJENT

Registrira se sam preko `/auth/register`.

- pregledava usluge, radnike i njihovo radno vrijeme
- vidi zauzete termine radnika za odabrani dan
- stvara rezervaciju i potvrđuje je u zadanom roku
- vidi i otkazuje samo vlastite rezervacije

### RADNIK

Kreira ga administrator preko `POST /radnici`.

- vidi samo svoj raspored
- vidi popis svojih klijenata
- ne može potvrđivati tuđe rezervacije ni mijenjati usluge

### ADMIN

Unosi se izravno u bazu.

- kreira radnike
- kreira, mijenja i briše usluge te ih dodjeljuje radnicima
- definira i briše radno vrijeme radnika
- vidi sve rezervacije i sve klijente, uz filtre po statusu, danu,
  radniku i klijentu

Administrator ima i sve ovlasti radnika - `require_role()` propušta `ADMIN`
svugdje gdje se traži `RADNIK`.

---

## Tok rezervacije

Između odabira termina i potvrde postoji
privremeno "čuvanje" odabranog termina, da dva klijenta ne bi uzela isti termin.

```
      KLIJENT bira radnika, uslugu i vrijeme
                     │
                     ▼
                rezervacija          ──► status: NEPOTVRDJENA
                     │                  rezervirano_do = sada + 10 min
                     │
         ┌───────────┴────────────┐
         ▼                        ▼
  potvrda u roku            rok istekao
         │                        │
         ▼                        ▼
                           zapis se briše, termin je opet slobodan
  status: AKTIVNA 
  (rezerviran termin)     
 
```

**1. Odabir termina** — `POST /rezervacije`

Prije upisa provjerava se redom:

- usluga i radnik postoje
- radnik stvarno nudi tu uslugu (`RADNIK_USLUGA`)
- termin nije u prošlosti
- termin cijeli stane unutar radnog vremena radnika za taj dan u tjednu
- termin se ne preklapa s postojećom rezervacijom

Kraj termina računa se iz trajanja usluge (`POCETAK + USLUGA.TRAJANJE`).
Zapis se sprema sa statusom `NEPOTVRDJENA` i rokom `REZERVIRANO_DO`.

**2. Potvrda** — `POST /rezervacije/{id}/potvrdi`

Ako je rok istekao, zapis se briše i termin je opet slobodan.
Inače status prelazi u `AKTIVNA`, a `REZERVIRANO_DO` se briše.

**3. Otkazivanje** — `POST /rezervacije/{id}/otkazi`

Status prelazi u `OTKAZANA`.

### Zauzetost termina

Termin zauzimaju rezervacije sa statusom `AKTIVNA`, te one `NEPOTVRDJENA`
kojima rok još traje. Istekla nepotvrđena "čuvanja" brišu se pri svakom
dohvatu rezervacija, pa se termin sam oslobađa.

Endpoint `/rezervacije/zauzeti-termini` vraća i oznaku `privremeno`, pa
frontend može razlikovati zauzet termin od onog koji netko drugi upravo drži.

Trajanje roka podešava se s `REZERVACIJA_ROK_POTVRDE_MINUTA` u `.env`, a
frontend ga čita s `/rezervacije/rok-potvrde`.

