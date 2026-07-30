"""Router za rezervacije (prefix /rezervacije)."""

from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from api.deps import get_current_user, require_role
from crud import rezervacija as crud
from db.session import get_session
from models.korisnik import KORISNIK, Uloga
from models.rezervacija import StatusRezervacije
from schemas.rezervacija import RezervacijaCreate, RezervacijaOut

router = APIRouter(prefix="/rezervacije", tags=["rezervacije"])


@router.post(
    "",
    response_model=RezervacijaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Kreiranje rezervacije (klijent)",
)
def create_rezervacija(
    data: RezervacijaCreate,
    session: Session = Depends(get_session),
    klijent: KORISNIK = Depends(require_role(Uloga.KLIJENT)),
):
    """Klijent rezervira termin; klijent_id se uzima iz tokena."""
    return crud.create_rezervacija(session, klijent.korisnik_id, data)


@router.get(
    "",
    response_model=list[RezervacijaOut],
    summary="Popis rezervacija (po ulozi, uz filtre)",
)
def list_rezervacije(
    session: Session = Depends(get_session),
    korisnik: KORISNIK = Depends(get_current_user),
    status_filter: StatusRezervacije | None = Query(
        default=None, alias="status", description="Filtriraj po statusu"
    ),
    datum: date | None = Query(default=None, description="Samo rezervacije tog dana"),
    radnik_id: int | None = Query(
        default=None, description="Samo admin: rezervacije određenog radnika"
    ),
    klijent_id: int | None = Query(
        default=None, description="Samo admin: rezervacije određenog klijenta"
    ),
) -> list:
    return crud.list_rezervacije_za_korisnika(
        session,
        korisnik,
        status_filter=status_filter,
        datum=datum,
        radnik_id=radnik_id,
        klijent_id=klijent_id,
    )


@router.get(
    "/{rezervacija_id}",
    response_model=RezervacijaOut,
    summary="Detalj rezervacije",
)
def get_rezervacija(
    rezervacija_id: int,
    session: Session = Depends(get_session),
    korisnik: KORISNIK = Depends(get_current_user),
):
    return crud.get_rezervacija_za_korisnika(session, rezervacija_id, korisnik)


@router.post(
    "/{rezervacija_id}/otkazi",
    response_model=RezervacijaOut,
    summary="Otkazivanje rezervacije",
)
def otkazi_rezervaciju(
    rezervacija_id: int,
    session: Session = Depends(get_session),
    korisnik: KORISNIK = Depends(get_current_user),
):
    """Klijent otkazuje svoju, radnik svoju (kao radnik), admin bilo koju."""
    return crud.otkazi_rezervaciju(session, rezervacija_id, korisnik)
