from decimal import Decimal
from enum import Enum

from sqlalchemy import Column
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, SQLModel

class Uloga(str, Enum):
    KLIJENT = "KLIJENT"
    RADNIK = "RADNIK"
    ADMIN = "ADMIN"

class KORISNIK(SQLModel, table=True):
    __tablename__ = "korisnik"

    korisnik_id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=100)
    lozinka: str = Field(max_length=255)
    uloga: Uloga = Field(
        sa_column=Column(SAEnum(Uloga, name="uloga_tip", create_type=False), nullable=False)
    )

class KLIJENT(SQLModel, table=True):
    __tablename__ = "klijent"

    korisnik_id: int = Field(
        foreign_key="korisnik.korisnik_id", primary_key=True
    )
    oib: str = Field(unique=True, max_length=11)
    ime: str = Field(max_length=50)
    prezime: str = Field(max_length=50)
    broj_telefona: str = Field(max_length=50)

class RADNIK(SQLModel, table=True):
    __tablename__ = "radnik"

    korisnik_id: int = Field(
        foreign_key="korisnik.korisnik_id", primary_key=True
    )
    ime: str = Field(max_length=50)
    prezime: str = Field(max_length=50)
    broj_telefona: str = Field(max_length=50)
    placa: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)
