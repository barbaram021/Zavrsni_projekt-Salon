from fastapi import APIRouter, Depends
from sqlmodel import Session

from api.deps import require_role
from crud.korisnik import get_klijent_or_404, list_klijenti, list_klijenti_radnika
from db.session import get_session
from models.korisnik import KORISNIK, Uloga
from schemas.korisnik import KlijentKontaktOut, KlijentOut

router = APIRouter(prefix="/klijenti", tags=["klijenti"])

@router.get("", response_model=list[KlijentOut], summary="Popis klijenata (admin)")
def list_klijenti_endpoint(
    session: Session = Depends(get_session),
    _=Depends(require_role(Uloga.ADMIN)),
) -> list:
    return list_klijenti(session)

@router.get(
    "/moji",
    response_model=list[KlijentKontaktOut],
    summary="Klijenti prijavljenog radnika (bez OIB-a)",
)
def list_mojih_klijenata_endpoint(
    session: Session = Depends(get_session),
    radnik: KORISNIK = Depends(require_role(Uloga.RADNIK)),
) -> list:
    return list_klijenti_radnika(session, radnik.korisnik_id)

@router.get(
    "/{klijent_id}", response_model=KlijentOut, summary="Detalj klijenta (admin)"
)
def get_klijent_endpoint(
    klijent_id: int,
    session: Session = Depends(get_session),
    _=Depends(require_role(Uloga.ADMIN)),
):
    return get_klijent_or_404(session, klijent_id)
