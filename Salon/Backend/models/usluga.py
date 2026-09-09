from enum import Enum

from sqlmodel import Field, SQLModel

class KategorijaUsluge(str, Enum):
    NOKTI = "NOKTI"
    DEPILACIJA_VOSKOM = "DEPILACIJA_VOSKOM"
    TREPAVICE = "TREPAVICE"
    OBRVE = "OBRVE"
    SMINKANJE = "SMINKANJE"

class USLUGA(SQLModel, table=True):
    __tablename__ = "usluga"

    usluga_id: int | None = Field(default=None, primary_key=True)
    trajanje: int
    cijena: int

class NOKTI(SQLModel, table=True):
    __tablename__ = "nokti"

    usluga_id: int = Field(foreign_key="usluga.usluga_id", primary_key=True)
    vrsta_noktiju: str

class DEPILACIJA_VOSKOM(SQLModel, table=True):
    __tablename__ = "depilacija_voskom"

    usluga_id: int = Field(foreign_key="usluga.usluga_id", primary_key=True)
    podrucje_depilacije: str

class TREPAVICE(SQLModel, table=True):
    __tablename__ = "trepavice"

    usluga_id: int = Field(foreign_key="usluga.usluga_id", primary_key=True)
    vrsta_trepavica: str

class OBRVE(SQLModel, table=True):
    __tablename__ = "obrve"

    usluga_id: int = Field(foreign_key="usluga.usluga_id", primary_key=True)
    vrsta_obrva: str

class SMINKANJE(SQLModel, table=True):
    __tablename__ = "sminkanje"

    usluga_id: int = Field(foreign_key="usluga.usluga_id", primary_key=True)
    vrsta_sminke: str

PODTIPOVI: dict[KategorijaUsluge, tuple[type[SQLModel], str, int]] = {
    KategorijaUsluge.NOKTI: (NOKTI, "vrsta_noktiju", 30),
    KategorijaUsluge.DEPILACIJA_VOSKOM: (DEPILACIJA_VOSKOM, "podrucje_depilacije", 30),
    KategorijaUsluge.TREPAVICE: (TREPAVICE, "vrsta_trepavica", 30),
    KategorijaUsluge.OBRVE: (OBRVE, "vrsta_obrva", 20),
    KategorijaUsluge.SMINKANJE: (SMINKANJE, "vrsta_sminke", 30),
}

class RADNIK_USLUGA(SQLModel, table=True):
    __tablename__ = "radnik_usluga"

    korisnik_id: int = Field(foreign_key="radnik.korisnik_id", primary_key=True)
    usluga_id: int = Field(foreign_key="usluga.usluga_id", primary_key=True)
