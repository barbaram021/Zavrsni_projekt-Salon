from fastapi import HTTPException, status
from sqlmodel import Session, select

from core.security import hash_password
from models.korisnik import KLIJENT, KORISNIK, RADNIK, Uloga
from schemas.auth import RegisterKlijentIn, RegisterRadnikIn

def get_korisnik_by_email(session: Session, email: str) -> KORISNIK | None:
    return session.exec(select(KORISNIK).where(KORISNIK.email == email)).first()

def list_radnici(session: Session) -> list[RADNIK]:
    return list(
        session.exec(select(RADNIK).order_by(RADNIK.prezime, RADNIK.ime)).all()
    )

def list_klijenti(session: Session) -> list[KLIJENT]:
    return list(
        session.exec(select(KLIJENT).order_by(KLIJENT.prezime, KLIJENT.ime)).all()
    )

def get_klijent_or_404(session: Session, klijent_id: int) -> KLIJENT:
    klijent = session.get(KLIJENT, klijent_id)
    if klijent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Klijent ne postoji."
        )
    return klijent

def _ensure_email_free(session: Session, email: str) -> None:
    if get_korisnik_by_email(session, email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Korisnik s tim emailom već postoji.",
        )

def create_klijent(session: Session, data: RegisterKlijentIn) -> KORISNIK:
    _ensure_email_free(session, data.email)

    if session.exec(select(KLIJENT).where(KLIJENT.oib == data.oib)).first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Klijent s tim OIB-om već postoji.",
        )

    korisnik = KORISNIK(
        email=data.email,
        lozinka=hash_password(data.password),
        uloga=Uloga.KLIJENT,
    )
    session.add(korisnik)
    session.flush()

    profil = KLIJENT(
        korisnik_id=korisnik.korisnik_id,
        oib=data.oib,
        ime=data.ime,
        prezime=data.prezime,
        broj_telefona=data.broj_telefona,
    )
    session.add(profil)
    session.commit()
    session.refresh(korisnik)
    return korisnik

def _create_korisnik_s_radnik_profilom(
    session: Session, data: RegisterRadnikIn, uloga: Uloga
) -> KORISNIK:
    _ensure_email_free(session, data.email)

    korisnik = KORISNIK(
        email=data.email,
        lozinka=hash_password(data.password),
        uloga=uloga,
    )
    session.add(korisnik)
    session.flush()

    profil = RADNIK(
        korisnik_id=korisnik.korisnik_id,
        ime=data.ime,
        prezime=data.prezime,
        broj_telefona=data.broj_telefona,
        placa=data.placa,
    )
    session.add(profil)
    session.commit()
    session.refresh(korisnik)
    return korisnik

def create_radnik(session: Session, data: RegisterRadnikIn) -> KORISNIK:
    return _create_korisnik_s_radnik_profilom(session, data, Uloga.RADNIK)

def create_admin(session: Session, data: RegisterRadnikIn) -> KORISNIK:
    return _create_korisnik_s_radnik_profilom(session, data, Uloga.ADMIN)
