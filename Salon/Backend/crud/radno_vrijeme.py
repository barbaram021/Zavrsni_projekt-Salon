"""CRUD nad radnim vremenom radnika."""

from fastapi import HTTPException, status
from sqlmodel import Session, select

from crud.usluga import get_radnik_or_404
from models.radno_vrijeme import RADNO_VRIJEME
from schemas.radno_vrijeme import RadnoVrijemeCreate


def list_radno_vrijeme(session: Session, radnik_id: int) -> list[RADNO_VRIJEME]:
    get_radnik_or_404(session, radnik_id)
    stmt = (
        select(RADNO_VRIJEME)
        .where(RADNO_VRIJEME.radnik_id == radnik_id)
        .order_by(RADNO_VRIJEME.dan_u_tjednu, RADNO_VRIJEME.vrijeme_od)
    )
    return list(session.exec(stmt).all())


def create_radno_vrijeme(
    session: Session, radnik_id: int, data: RadnoVrijemeCreate
) -> RADNO_VRIJEME:
    get_radnik_or_404(session, radnik_id)

    # Spriječi preklapanje s postojećim intervalom istog dana.
    postojeci = session.exec(
        select(RADNO_VRIJEME).where(
            RADNO_VRIJEME.radnik_id == radnik_id,
            RADNO_VRIJEME.dan_u_tjednu == data.dan_u_tjednu,
        )
    ).all()
    for rv in postojeci:
        if data.vrijeme_od < rv.vrijeme_do and rv.vrijeme_od < data.vrijeme_do:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Interval se preklapa s postojećim radnim vremenom.",
            )

    rv = RADNO_VRIJEME(
        radnik_id=radnik_id,
        dan_u_tjednu=data.dan_u_tjednu,
        vrijeme_od=data.vrijeme_od,
        vrijeme_do=data.vrijeme_do,
    )
    session.add(rv)
    session.commit()
    session.refresh(rv)
    return rv


def delete_radno_vrijeme(
    session: Session, radnik_id: int, radno_vrijeme_id: int
) -> None:
    rv = session.get(RADNO_VRIJEME, radno_vrijeme_id)
    if rv is None or rv.radnik_id != radnik_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Radno vrijeme ne postoji za tog radnika.",
        )
    session.delete(rv)
    session.commit()
