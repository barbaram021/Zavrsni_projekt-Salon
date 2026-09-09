from datetime import time

from sqlmodel import Field, SQLModel

class RADNO_VRIJEME(SQLModel, table=True):
    __tablename__ = "radno_vrijeme"

    radno_vrijeme_id: int | None = Field(default=None, primary_key=True)
    radnik_id: int = Field(foreign_key="radnik.korisnik_id")
    dan_u_tjednu: int
    vrijeme_od: time
    vrijeme_do: time
