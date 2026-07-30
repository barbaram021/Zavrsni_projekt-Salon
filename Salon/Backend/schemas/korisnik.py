"""Pydantic sheme za prikaz profila radnika i klijenata.

Namjerno bez osjetljivih polja u javnom prikazu: radnikova plaća se ne izlaže
kroz javni popis, a email/lozinka nisu dio profilnih shema.
"""

from pydantic import BaseModel, ConfigDict


class RadnikOut(BaseModel):
    """Javni prikaz radnika (bez plaće)."""

    model_config = ConfigDict(from_attributes=True)

    korisnik_id: int
    ime: str
    prezime: str
    broj_telefona: str


class KlijentOut(BaseModel):
    """Prikaz klijenta (za admina)."""

    model_config = ConfigDict(from_attributes=True)

    korisnik_id: int
    oib: str
    ime: str
    prezime: str
    broj_telefona: str
