from datetime import datetime
from enum import Enum

from sqlalchemy import Column
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, SQLModel

class StatusRezervacije(str, Enum):
    NEPOTVRDJENA = "NEPOTVRDJENA"
    AKTIVNA = "AKTIVNA"
    OTKAZANA = "OTKAZANA"

class REZERVACIJA(SQLModel, table=True):
    __tablename__ = "rezervacija"

    rezervacija_id: int | None = Field(default=None, primary_key=True)
    klijent_id: int = Field(foreign_key="klijent.korisnik_id")
    radnik_id: int = Field(foreign_key="radnik.korisnik_id")
    usluga_id: int = Field(foreign_key="usluga.usluga_id")
    pocetak: datetime
    kraj: datetime
    status: StatusRezervacije = Field(
        sa_column=Column(
            SAEnum(StatusRezervacije, name="status_rezervacije", create_type=False),
            nullable=False,
        ),
        default=StatusRezervacije.NEPOTVRDJENA,
    )
    napomena: str | None = Field(default=None, max_length=500)
    rezervirano_do: datetime | None = Field(default=None)
