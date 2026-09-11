from pydantic import BaseModel, ConfigDict

class RadnikOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    korisnik_id: int
    ime: str
    prezime: str
    broj_telefona: str

class KlijentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    korisnik_id: int
    oib: str
    ime: str
    prezime: str
    broj_telefona: str

class KlijentKontaktOut(BaseModel):
    """Klijent bez OIB-a — podaci koje radnik smije vidjeti o svojim klijentima."""

    model_config = ConfigDict(from_attributes=True)

    korisnik_id: int
    ime: str
    prezime: str
    broj_telefona: str
