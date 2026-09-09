from fastapi import HTTPException, status
from sqlmodel import Session, select

from models.korisnik import RADNIK
from models.usluga import PODTIPOVI, RADNIK_USLUGA, USLUGA, KategorijaUsluge
from schemas.usluga import UslugaCreate, UslugaOut, UslugaUpdate

def get_usluga_or_404(session: Session, usluga_id: int) -> USLUGA:
    usluga = session.get(USLUGA, usluga_id)
    if usluga is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usluga ne postoji."
        )
    return usluga

def get_radnik_or_404(session: Session, radnik_id: int) -> RADNIK:
    radnik = session.get(RADNIK, radnik_id)
    if radnik is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Radnik ne postoji."
        )
    return radnik

def _ucitaj_podtip(
    session: Session, usluga_id: int
) -> tuple[KategorijaUsluge | None, str | None]:
    for kategorija, (model, attr, _max) in PODTIPOVI.items():
        redak = session.get(model, usluga_id)
        if redak is not None:
            return kategorija, getattr(redak, attr)
    return None, None

def _u_out(session: Session, usluga: USLUGA) -> UslugaOut:
    kategorija, vrsta = _ucitaj_podtip(session, usluga.usluga_id)
    return UslugaOut(
        usluga_id=usluga.usluga_id,
        trajanje=usluga.trajanje,
        cijena=usluga.cijena,
        kategorija=kategorija,
        vrsta=vrsta,
    )

def _provjeri_duljinu_vrste(kategorija: KategorijaUsluge, vrsta: str) -> None:
    max_len = PODTIPOVI[kategorija][2]
    if len(vrsta) > max_len:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'vrsta' smije imati najviše {max_len} znakova za tu kategoriju.",
        )

def _veza_radnik_usluga(
    session: Session, radnik_id: int, usluga_id: int
) -> RADNIK_USLUGA | None:
    return session.exec(
        select(RADNIK_USLUGA).where(
            RADNIK_USLUGA.korisnik_id == radnik_id,
            RADNIK_USLUGA.usluga_id == usluga_id,
        )
    ).first()

def list_usluge(session: Session) -> list[UslugaOut]:
    usluge = session.exec(select(USLUGA).order_by(USLUGA.usluga_id)).all()
    return [_u_out(session, u) for u in usluge]

def get_usluga_out(session: Session, usluga_id: int) -> UslugaOut:
    return _u_out(session, get_usluga_or_404(session, usluga_id))

def create_usluga(session: Session, data: UslugaCreate) -> UslugaOut:
    _provjeri_duljinu_vrste(data.kategorija, data.vrsta)

    usluga = USLUGA(trajanje=data.trajanje, cijena=data.cijena)
    session.add(usluga)
    session.flush()

    model, attr, _max = PODTIPOVI[data.kategorija]
    session.add(model(usluga_id=usluga.usluga_id, **{attr: data.vrsta}))
    session.commit()
    session.refresh(usluga)
    return _u_out(session, usluga)

def update_usluga(session: Session, usluga_id: int, data: UslugaUpdate) -> UslugaOut:
    usluga = get_usluga_or_404(session, usluga_id)

    kategorija, _vrsta = _ucitaj_podtip(session, usluga_id)
    if kategorija is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Usluga nema pridruženu kategoriju (podtip) pa se ne može ažurirati.",
        )
    _provjeri_duljinu_vrste(kategorija, data.vrsta)

    usluga.trajanje = data.trajanje
    usluga.cijena = data.cijena
    session.add(usluga)

    model, attr, _max = PODTIPOVI[kategorija]
    podtip = session.get(model, usluga_id)
    setattr(podtip, attr, data.vrsta)
    session.add(podtip)

    session.commit()
    session.refresh(usluga)
    return _u_out(session, usluga)

def delete_usluga(session: Session, usluga_id: int) -> None:
    usluga = get_usluga_or_404(session, usluga_id)

    for veza in session.exec(
        select(RADNIK_USLUGA).where(RADNIK_USLUGA.usluga_id == usluga_id)
    ).all():
        session.delete(veza)

    for model, _attr, _max in PODTIPOVI.values():
        podtip = session.get(model, usluga_id)
        if podtip is not None:
            session.delete(podtip)

    session.delete(usluga)
    session.commit()

def list_usluge_radnika(session: Session, radnik_id: int) -> list[UslugaOut]:
    get_radnik_or_404(session, radnik_id)
    stmt = (
        select(USLUGA)
        .join(RADNIK_USLUGA, RADNIK_USLUGA.usluga_id == USLUGA.usluga_id)
        .where(RADNIK_USLUGA.korisnik_id == radnik_id)
        .order_by(USLUGA.usluga_id)
    )
    return [_u_out(session, u) for u in session.exec(stmt).all()]

def list_radnici_za_uslugu(session: Session, usluga_id: int) -> list[RADNIK]:
    get_usluga_or_404(session, usluga_id)
    stmt = (
        select(RADNIK)
        .join(RADNIK_USLUGA, RADNIK_USLUGA.korisnik_id == RADNIK.korisnik_id)
        .where(RADNIK_USLUGA.usluga_id == usluga_id)
        .order_by(RADNIK.prezime, RADNIK.ime)
    )
    return list(session.exec(stmt).all())

def dodijeli_uslugu_radniku(session: Session, radnik_id: int, usluga_id: int) -> None:
    get_radnik_or_404(session, radnik_id)
    get_usluga_or_404(session, usluga_id)
    if _veza_radnik_usluga(session, radnik_id, usluga_id) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Radnik već nudi tu uslugu.",
        )
    session.add(RADNIK_USLUGA(korisnik_id=radnik_id, usluga_id=usluga_id))
    session.commit()

def ukloni_uslugu_radniku(session: Session, radnik_id: int, usluga_id: int) -> None:
    veza = _veza_radnik_usluga(session, radnik_id, usluga_id)
    if veza is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Radnik ne nudi tu uslugu.",
        )
    session.delete(veza)
    session.commit()
