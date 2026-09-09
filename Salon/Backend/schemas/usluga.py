from pydantic import BaseModel, ConfigDict, Field

from models.usluga import KategorijaUsluge

class UslugaCreate(BaseModel):
    trajanje: int = Field(gt=0, description="Trajanje u minutama (> 0)")
    cijena: int = Field(ge=0, description="Cijena (cijeli broj)")
    kategorija: KategorijaUsluge = Field(description="Kategorija (bira podtip)")
    vrsta: str = Field(min_length=1, description="Opis podtipa, npr. 'gel' za nokte")

class UslugaUpdate(BaseModel):
    trajanje: int = Field(gt=0)
    cijena: int = Field(ge=0)
    vrsta: str = Field(min_length=1, description="Nova vrijednost opisnog atributa")

class UslugaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    usluga_id: int
    trajanje: int
    cijena: int
    kategorija: KategorijaUsluge | None
    vrsta: str | None

class DodjelaUslugeIn(BaseModel):
    usluga_id: int
