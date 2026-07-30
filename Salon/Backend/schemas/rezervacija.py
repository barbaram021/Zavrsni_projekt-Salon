"""Pydantic sheme za rezervacije.

Ulazna shema ne prima `klijent_id`, `kraj` ni `status` — to postavlja
poslužitelj (klijent iz tokena, kraj iz trajanja usluge, status = AKTIVNA).
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from models.rezervacija import StatusRezervacije


class RezervacijaCreate(BaseModel):
    """Podaci za kreiranje rezervacije (klijent)."""

    radnik_id: int
    usluga_id: int
    pocetak: datetime
    napomena: str | None = Field(default=None, max_length=500)


class RezervacijaOut(BaseModel):
    """Prikaz rezervacije."""

    model_config = ConfigDict(from_attributes=True)

    rezervacija_id: int
    klijent_id: int
    radnik_id: int
    usluga_id: int
    pocetak: datetime
    kraj: datetime
    status: StatusRezervacije
    napomena: str | None
