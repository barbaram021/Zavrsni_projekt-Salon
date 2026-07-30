"""Pydantic sheme za radno vrijeme radnika."""

from datetime import time

from pydantic import BaseModel, ConfigDict, Field, model_validator


class RadnoVrijemeCreate(BaseModel):
    """Podaci za dodavanje intervala radnog vremena (admin)."""

    dan_u_tjednu: int = Field(ge=1, le=7, description="1=pon … 7=ned")
    vrijeme_od: time
    vrijeme_do: time

    @model_validator(mode="after")
    def _provjeri_interval(self) -> "RadnoVrijemeCreate":
        if self.vrijeme_od >= self.vrijeme_do:
            raise ValueError("vrijeme_od mora biti prije vrijeme_do.")
        return self


class RadnoVrijemeOut(BaseModel):
    """Prikaz intervala radnog vremena."""

    model_config = ConfigDict(from_attributes=True)

    radno_vrijeme_id: int
    radnik_id: int
    dan_u_tjednu: int
    vrijeme_od: time
    vrijeme_do: time
