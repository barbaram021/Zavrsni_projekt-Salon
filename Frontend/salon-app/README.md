# Gabi&Barbi — Frontend

Angular 21 (standalone komponente, signali, zoneless) + Tailwind CSS 4.
Dizajn je preuzet iz `Frontend/dizajn/Gabi&Barbi Booking.dc.html` — paleta, tipografija
(Cormorant Garamond + Poppins) i oblici kontrola definirani su kao Tailwind tokeni u
[`src/styles.css`](src/styles.css).

## Pokretanje

Backend mora raditi na `http://127.0.0.1:8000`:

```bash
cd ../../Salon/Backend
../Scripts/uvicorn.exe main:app --reload
```

Zatim frontend:

```bash
npm install
npm start          # http://localhost:4200
```

Adresa API-ja postavlja se u [`src/environments/environment.ts`](src/environments/environment.ts).

## Struktura

| Mapa | Sadržaj |
| --- | --- |
| `src/app/core/models` | Tipovi preslikani na Pydantic sheme + katalog kategorija usluga |
| `src/app/core/services` | `AuthService`, `SalonApiService` (sve rute backenda), obavijesti |
| `src/app/core/guards` | Zaštita ruta i provjera uloge |
| `src/app/core/interceptors` | Bearer token i automatska odjava na 401 |
| `src/app/core/util` | Rad s „naive” datumima i porukama grešaka |
| `src/app/features/auth` | Prijava i registracija klijenta |
| `src/app/features/klijent` | Čarobnjak za rezervaciju i pregled vlastitih rezervacija |
| `src/app/features/radnik` | Dnevni raspored radnika |
| `src/app/features/admin` | Zaposlenici, radno vrijeme, usluge, pregled rezervacija |

## Uloge i rute

| Ruta | Uloga | Opis |
| --- | --- | --- |
| `/prijava` | — | Prijava; registracija je dostupna klijentima |
| `/rezervacija` | KLIJENT | Odabir usluga → radnika → termina → potvrda |
| `/moje-rezervacije` | KLIJENT | Potvrda i otkazivanje vlastitih rezervacija |
| `/radnik` | RADNIK, ADMIN | Raspored po danima |
| `/admin` | ADMIN | Upravljanje salonom |

## Tok rezervacije

Backend veže **jednu uslugu po rezervaciji** i drži termin privremeno
(status `NEPOTVRDJENA`, polje `rezervirano_do`). Frontend to koristi ovako:

1. Klijent bira kategorije i vrste usluga; ponuđeni su samo radnici koji nude **sve** odabrane usluge.
2. Slobodni termini računaju se iz `radno-vrijeme` radnika umanjenog za `zauzeti-termini`,
   uz ukupno trajanje svih odabranih usluga.
3. Ulaskom na ekran plaćanja stvara se po jedna rezervacija za svaku uslugu — nižu se
   jedna na drugu od odabranog vremena. Prikazuje se odbrojavanje do isteka roka.
4. „Potvrdi rezervaciju” poziva `/rezervacije/{id}/potvrdi` za svaku od njih.
5. Povratak s tog ekrana otkazuje privremena držanja umjesto da se čeka istek roka.

Ekran plaćanja je vizualni dio dizajna — backend ne bilježi način plaćanja niti podatke
o kartici, pa se oni nigdje ne šalju.
