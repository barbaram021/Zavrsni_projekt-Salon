"""Pydantic sheme za usluge i vezu radnik–usluga.

Usluga u API-ju objedinjuje baznu tablicu (cijena, trajanje) i njezin podtip:
`kategorija` bira tablicu, a `vrsta` je vrijednost njezinog opisnog atributa
(npr. za NOKTI to je `vrsta_noktiju`).
"""

from pydantic import BaseModel, ConfigDict, Field

from models.usluga import KategorijaUsluge


class UslugaCreate(BaseModel):
    """Podaci za kreiranje usluge (admin) — bazni + podtip u jednom zahtjevu."""

    trajanje: int = Field(gt=0, description="Trajanje u minutama (> 0)")
    cijena: int = Field(ge=0, description="Cijena (cijeli broj)")
    kategorija: KategorijaUsluge = Field(description="Kategorija (bira podtip)")
    vrsta: str = Field(min_length=1, description="Opis podtipa, npr. 'gel' za nokte")


class UslugaUpdate(BaseModel):
    """Podaci za izmjenu usluge (puni PUT).

    Kategorija se ne mijenja — promjena kategorije = brisanje + novo kreiranje.
    """

    trajanje: int = Field(gt=0)
    cijena: int = Field(ge=0)
    vrsta: str = Field(min_length=1, description="Nova vrijednost opisnog atributa")


class UslugaOut(BaseModel):
    """Prikaz usluge (bazni podaci + kategorija i vrsta iz podtipa)."""

    model_config = ConfigDict(from_attributes=True)

    usluga_id: int
    trajanje: int
    cijena: int
    kategorija: KategorijaUsluge | None
    vrsta: str | None


class DodjelaUslugeIn(BaseModel):
    """Tijelo zahtjeva za dodjelu usluge radniku."""

    usluga_id: int
