from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from api.deps import require_role
from crud.korisnik import create_radnik, list_radnici
from crud.usluga import get_radnik_or_404
from db.session import get_session
from models.korisnik import KORISNIK, Uloga
from schemas.auth import KorisnikOut, RegisterRadnikIn
from schemas.korisnik import RadnikOut

router = APIRouter(prefix="/radnici", tags=["radnici"])

@router.get("", response_model=list[RadnikOut], summary="Popis radnika")
def list_radnici_endpoint(session: Session = Depends(get_session)) -> list:
    return list_radnici(session)

@router.get("/{radnik_id}", response_model=RadnikOut, summary="Detalj radnika")
def get_radnik_endpoint(radnik_id: int, session: Session = Depends(get_session)):
    return get_radnik_or_404(session, radnik_id)

@router.post(
    "",
    response_model=KorisnikOut,
    status_code=status.HTTP_201_CREATED,
    summary="Kreiranje novog radnika (samo admin)",
)
def create_radnik_endpoint(
    data: RegisterRadnikIn,
    session: Session = Depends(get_session),
    _: KORISNIK = Depends(require_role(Uloga.ADMIN)),
) -> KORISNIK:
    return create_radnik(session, data)
