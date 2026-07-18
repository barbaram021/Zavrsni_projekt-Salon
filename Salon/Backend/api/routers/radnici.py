"""Router za radnike: kreiranje radnika (samo prijavljeni radnik)."""

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from api.deps import require_role
from crud.korisnik import create_radnik
from db.session import get_session
from models.korisnik import KORISNIK, Uloga
from schemas.auth import KorisnikOut, RegisterRadnikIn

router = APIRouter(prefix="/radnici", tags=["radnici"])


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
    """Zaštićeno: samo prijavljeni admin može otvoriti novi radnički račun."""
    return create_radnik(session, data)
