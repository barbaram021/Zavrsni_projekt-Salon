"""CRUD nad rezervacijama, uključujući provjeru dostupnosti termina.

Kreiranje rezervacije provjerava (redom): postoji li usluga, nudi li je radnik,
je li termin unutar radnog vremena radnika i ne preklapa li se s postojećom
aktivnom rezervacijom.
"""

from datetime import date, datetime, time, timedelta

from fastapi import HTTPException, status
from sqlmodel import Session, select

from crud.usluga import _veza_radnik_usluga, get_radnik_or_404, get_usluga_or_404
from models.korisnik import KORISNIK, Uloga
from models.radno_vrijeme import RADNO_VRIJEME
from models.rezervacija import REZERVACIJA, StatusRezervacije
from schemas.rezervacija import RezervacijaCreate


def _provjeri_radno_vrijeme(
    session: Session, radnik_id: int, pocetak: datetime, kraj: datetime
) -> None:
    """Termin mora cijeli stati unutar jednog intervala radnog vremena tog dana."""
    dan = pocetak.isoweekday()  # 1=pon … 7=ned
    intervali = session.exec(
        select(RADNO_VRIJEME).where(
            RADNO_VRIJEME.radnik_id == radnik_id,
            RADNO_VRIJEME.dan_u_tjednu == dan,
        )
    ).all()
    stane = any(
        pocetak.time() >= rv.vrijeme_od and kraj.time() <= rv.vrijeme_do
        for rv in intervali
    )
    if not stane:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Termin je izvan radnog vremena radnika.",
        )


def _provjeri_preklapanje(
    session: Session, radnik_id: int, pocetak: datetime, kraj: datetime
) -> None:
    """Radnik ne smije imati drugu AKTIVNU rezervaciju koja se vremenski preklapa."""
    sukob = session.exec(
        select(REZERVACIJA).where(
            REZERVACIJA.radnik_id == radnik_id,
            REZERVACIJA.status == StatusRezervacije.AKTIVNA,
            REZERVACIJA.pocetak < kraj,
            REZERVACIJA.kraj > pocetak,
        )
    ).first()
    if sukob is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Radnik već ima rezervaciju u tom terminu.",
        )


def create_rezervacija(
    session: Session, klijent_id: int, data: RezervacijaCreate
) -> REZERVACIJA:
    usluga = get_usluga_or_404(session, data.usluga_id)
    get_radnik_or_404(session, data.radnik_id)

    # Radnik mora nuditi tu uslugu.
    if _veza_radnik_usluga(session, data.radnik_id, data.usluga_id) is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Radnik ne nudi odabranu uslugu.",
        )

    if data.pocetak < datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Termin ne može biti u prošlosti.",
        )

    kraj = data.pocetak + timedelta(minutes=usluga.trajanje)
    _provjeri_radno_vrijeme(session, data.radnik_id, data.pocetak, kraj)
    _provjeri_preklapanje(session, data.radnik_id, data.pocetak, kraj)

    rezervacija = REZERVACIJA(
        klijent_id=klijent_id,
        radnik_id=data.radnik_id,
        usluga_id=data.usluga_id,
        pocetak=data.pocetak,
        kraj=kraj,
        status=StatusRezervacije.AKTIVNA,
        napomena=data.napomena,
    )
    session.add(rezervacija)
    session.commit()
    session.refresh(rezervacija)
    return rezervacija


def list_rezervacije_za_korisnika(
    session: Session,
    korisnik: KORISNIK,
    *,
    status_filter: StatusRezervacije | None = None,
    datum: date | None = None,
    radnik_id: int | None = None,
    klijent_id: int | None = None,
) -> list[REZERVACIJA]:
    """Popis rezervacija, ograničen ulogom pa dodatno filtriran.

    Osnovni opseg po ulozi: klijent → svoje, radnik → svoje, admin → sve.
    Filtri `radnik_id`/`klijent_id` primjenjuju se samo za admina (klijent i
    radnik ionako vide isključivo svoje). `status_filter` i `datum` vrijede za sve.
    """
    stmt = select(REZERVACIJA).order_by(REZERVACIJA.pocetak)

    if korisnik.uloga == Uloga.KLIJENT:
        stmt = stmt.where(REZERVACIJA.klijent_id == korisnik.korisnik_id)
    elif korisnik.uloga == Uloga.RADNIK:
        stmt = stmt.where(REZERVACIJA.radnik_id == korisnik.korisnik_id)
    elif korisnik.uloga == Uloga.ADMIN:
        if radnik_id is not None:
            stmt = stmt.where(REZERVACIJA.radnik_id == radnik_id)
        if klijent_id is not None:
            stmt = stmt.where(REZERVACIJA.klijent_id == klijent_id)

    if status_filter is not None:
        stmt = stmt.where(REZERVACIJA.status == status_filter)
    if datum is not None:
        dan_od = datetime.combine(datum, time.min)
        stmt = stmt.where(
            REZERVACIJA.pocetak >= dan_od,
            REZERVACIJA.pocetak < dan_od + timedelta(days=1),
        )

    return list(session.exec(stmt).all())


def get_rezervacija_za_korisnika(
    session: Session, rezervacija_id: int, korisnik: KORISNIK
) -> REZERVACIJA:
    """Dohvati uz provjeru pristupa (vlasnik klijent, dodijeljeni radnik, ili admin)."""
    rezervacija = session.get(REZERVACIJA, rezervacija_id)
    if rezervacija is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Rezervacija ne postoji."
        )
    if not _smije_pristupiti(rezervacija, korisnik):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nemate pristup toj rezervaciji.",
        )
    return rezervacija


def otkazi_rezervaciju(
    session: Session, rezervacija_id: int, korisnik: KORISNIK
) -> REZERVACIJA:
    rezervacija = get_rezervacija_za_korisnika(session, rezervacija_id, korisnik)
    if rezervacija.status == StatusRezervacije.OTKAZANA:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Rezervacija je već otkazana.",
        )
    rezervacija.status = StatusRezervacije.OTKAZANA
    session.add(rezervacija)
    session.commit()
    session.refresh(rezervacija)
    return rezervacija


def _smije_pristupiti(rezervacija: REZERVACIJA, korisnik: KORISNIK) -> bool:
    if korisnik.uloga == Uloga.ADMIN:
        return True
    if korisnik.uloga == Uloga.KLIJENT:
        return rezervacija.klijent_id == korisnik.korisnik_id
    if korisnik.uloga == Uloga.RADNIK:
        return rezervacija.radnik_id == korisnik.korisnik_id
    return False
