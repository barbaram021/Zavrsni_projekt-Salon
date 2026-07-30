"""SQLModel model za RADNO_VRIJEME (tjedni raspored radnika).

Ponavljajući tjedni raspored: za svaki dan u tjednu (1=ponedjeljak … 7=nedjelja)
interval od–do unutar kojeg radnik radi. Koristi se pri provjeri dostupnosti
termina za rezervacije.
"""

from datetime import time

from sqlmodel import Field, SQLModel


class RADNO_VRIJEME(SQLModel, table=True):
    """Interval radnog vremena radnika za jedan dan u tjednu."""

    __tablename__ = "radno_vrijeme"

    radno_vrijeme_id: int | None = Field(default=None, primary_key=True)
    radnik_id: int = Field(foreign_key="radnik.korisnik_id")
    dan_u_tjednu: int  # 1=pon … 7=ned (poklapa se s datetime.isoweekday())
    vrijeme_od: time
    vrijeme_do: time
