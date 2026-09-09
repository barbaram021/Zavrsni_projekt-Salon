from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from api.deps import require_role
from crud import usluga as crud
from db.session import get_session
from models.korisnik import Uloga
from schemas.korisnik import RadnikOut
from schemas.usluga import DodjelaUslugeIn, UslugaCreate, UslugaOut, UslugaUpdate

router = APIRouter(prefix="/usluge", tags=["usluge"])
radnik_router = APIRouter(prefix="/radnici", tags=["usluge"])

@router.get("", response_model=list[UslugaOut], summary="Popis usluga")
def list_usluge(session: Session = Depends(get_session)) -> list:
    return crud.list_usluge(session)

@router.get("/{usluga_id}", response_model=UslugaOut, summary="Detalj usluge")
def get_usluga(usluga_id: int, session: Session = Depends(get_session)):
    return crud.get_usluga_out(session, usluga_id)

@router.get(
    "/{usluga_id}/radnici",
    response_model=list[RadnikOut],
    summary="Radnici koji nude uslugu",
)
def list_radnici_za_uslugu(
    usluga_id: int, session: Session = Depends(get_session)
) -> list:
    return crud.list_radnici_za_uslugu(session, usluga_id)

@router.post(
    "",
    response_model=UslugaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Kreiranje usluge (admin)",
)
def create_usluga(
    data: UslugaCreate,
    session: Session = Depends(get_session),
    _=Depends(require_role(Uloga.ADMIN)),
):
    return crud.create_usluga(session, data)

@router.put("/{usluga_id}", response_model=UslugaOut, summary="Izmjena usluge (admin)")
def update_usluga(
    usluga_id: int,
    data: UslugaUpdate,
    session: Session = Depends(get_session),
    _=Depends(require_role(Uloga.ADMIN)),
):
    return crud.update_usluga(session, usluga_id, data)

@router.delete(
    "/{usluga_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Brisanje usluge (admin)",
)
def delete_usluga(
    usluga_id: int,
    session: Session = Depends(get_session),
    _=Depends(require_role(Uloga.ADMIN)),
):
    crud.delete_usluga(session, usluga_id)

@radnik_router.get(
    "/{radnik_id}/usluge",
    response_model=list[UslugaOut],
    summary="Usluge koje radnik nudi",
)
def list_usluge_radnika(radnik_id: int, session: Session = Depends(get_session)) -> list:
    return crud.list_usluge_radnika(session, radnik_id)

@radnik_router.post(
    "/{radnik_id}/usluge",
    status_code=status.HTTP_201_CREATED,
    summary="Dodjela usluge radniku (admin)",
)
def dodijeli_uslugu(
    radnik_id: int,
    data: DodjelaUslugeIn,
    session: Session = Depends(get_session),
    _=Depends(require_role(Uloga.ADMIN)),
):
    crud.dodijeli_uslugu_radniku(session, radnik_id, data.usluga_id)
    return {"detail": "Usluga dodijeljena radniku."}

@radnik_router.delete(
    "/{radnik_id}/usluge/{usluga_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Uklanjanje usluge radniku (admin)",
)
def ukloni_uslugu(
    radnik_id: int,
    usluga_id: int,
    session: Session = Depends(get_session),
    _=Depends(require_role(Uloga.ADMIN)),
):
    crud.ukloni_uslugu_radniku(session, radnik_id, usluga_id)
