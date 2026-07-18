"""SQLModel modeli za KORISNIK, KLIJENT i RADNIK.

Ove klase zrcale tablice koje već postoje u PostgreSQL bazi (kreirane zasebno).
Zato:
- imena tablica i stupaca su mala slova (PostgreSQL folda necitirane
  identifikatore iz DDL-a u mala slova),
- ne kreiramo tablice iz koda (nema `create_all`),
- za `uloga` koristimo postojeći Postgres ENUM tip `uloga_tip`
  (`create_type=False`) da ga SQLAlchemy ne pokušava ponovno stvoriti.
"""

from decimal import Decimal
from enum import Enum

from sqlalchemy import Column
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, SQLModel


class Uloga(str, Enum):
    """Vrijednosti Postgres ENUM tipa `uloga_tip`."""

    KLIJENT = "KLIJENT"
    RADNIK = "RADNIK"
    ADMIN = "ADMIN"


class KORISNIK(SQLModel, table=True):
    """Zajednički korisnički račun (prijava): email, lozinka (hash), uloga."""

    __tablename__ = "korisnik"

    # None jer bazi prepuštamo dodjelu ID-a (autoincrement / IDENTITY).
    korisnik_id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=100)
    lozinka: str = Field(max_length=255)  # bcrypt hash, nikad plaintext
    uloga: Uloga = Field(
        sa_column=Column(SAEnum(Uloga, name="uloga_tip", create_type=False), nullable=False)
    )


class KLIJENT(SQLModel, table=True):
    """Profil klijenta; dijeli PK s KORISNIK (korisnik_id je i PK i FK)."""

    __tablename__ = "klijent"

    korisnik_id: int = Field(
        foreign_key="korisnik.korisnik_id", primary_key=True
    )
    oib: str = Field(unique=True, max_length=11)
    ime: str = Field(max_length=50)
    prezime: str = Field(max_length=50)
    broj_telefona: str = Field(max_length=50)


class RADNIK(SQLModel, table=True):
    """Profil radnika; dijeli PK s KORISNIK (korisnik_id je i PK i FK)."""

    __tablename__ = "radnik"

    korisnik_id: int = Field(
        foreign_key="korisnik.korisnik_id", primary_key=True
    )
    ime: str = Field(max_length=50)
    prezime: str = Field(max_length=50)
    broj_telefona: str = Field(max_length=50)
    placa: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)
