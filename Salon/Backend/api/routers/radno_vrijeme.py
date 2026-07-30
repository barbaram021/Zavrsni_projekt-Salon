"""Router za radno vrijeme radnika (prefix /radnici)."""

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from api.deps import get_current_user, require_role
from crud import radno_vrijeme as crud
from db.session import get_session
from models.korisnik import Uloga
from schemas.radno_vrijeme import RadnoVrijemeCreate, RadnoVrijemeOut

router = APIRouter(prefix="/radnici", tags=["radno-vrijeme"])


@router.get(
    "/{radnik_id}/radno-vrijeme",
    response_model=list[RadnoVrijemeOut],
    summary="Radno vrijeme radnika",
)
def list_radno_vrijeme(
    radnik_id: int,
    session: Session = Depends(get_session),
    _=Depends(get_current_user),
) -> list:
    return crud.list_radno_vrijeme(session, radnik_id)


@router.post(
    "/{radnik_id}/radno-vrijeme",
    response_model=RadnoVrijemeOut,
    status_code=status.HTTP_201_CREATED,
    summary="Dodavanje radnog vremena (admin)",
)
def create_radno_vrijeme(
    radnik_id: int,
    data: RadnoVrijemeCreate,
    session: Session = Depends(get_session),
    _=Depends(require_role(Uloga.ADMIN)),
):
    return crud.create_radno_vrijeme(session, radnik_id, data)


@router.delete(
    "/{radnik_id}/radno-vrijeme/{radno_vrijeme_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Brisanje radnog vremena (admin)",
)
def delete_radno_vrijeme(
    radnik_id: int,
    radno_vrijeme_id: int,
    session: Session = Depends(get_session),
    _=Depends(require_role(Uloga.ADMIN)),
):
    crud.delete_radno_vrijeme(session, radnik_id, radno_vrijeme_id)
