from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field

from models.rezervacija import StatusRezervacije

class RezervacijaCreate(BaseModel):
    radnik_id: int
    usluga_id: int
    pocetak: datetime
    napomena: str | None = Field(default=None, max_length=500)

class RezervacijaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rezervacija_id: int
    klijent_id: int
    radnik_id: int
    usluga_id: int
    pocetak: datetime
    kraj: datetime
    status: StatusRezervacije
    napomena: str | None
    rezervirano_do: datetime | None = None

    @computed_field
    @property
    def sekundi_do_isteka(self) -> int | None:
        if self.status != StatusRezervacije.NEPOTVRDJENA or self.rezervirano_do is None:
            return None
        return max(0, int((self.rezervirano_do - datetime.now()).total_seconds()))

class ZauzetTerminOut(BaseModel):
    pocetak: datetime
    kraj: datetime
    privremeno: bool
