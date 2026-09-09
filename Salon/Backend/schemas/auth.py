from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from models.korisnik import Uloga

class RegisterKlijentIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    oib: str = Field(pattern=r"^\d{11}$", description="OIB — točno 11 znamenki")
    ime: str = Field(min_length=1, max_length=50)
    prezime: str = Field(min_length=1, max_length=50)
    broj_telefona: str = Field(min_length=1, max_length=50)

class RegisterRadnikIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    ime: str = Field(min_length=1, max_length=50)
    prezime: str = Field(min_length=1, max_length=50)
    broj_telefona: str = Field(min_length=1, max_length=50)
    placa: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class KorisnikOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    korisnik_id: int
    email: EmailStr
    uloga: Uloga
