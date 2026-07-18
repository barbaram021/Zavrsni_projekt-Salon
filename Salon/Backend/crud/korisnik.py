"""CRUD operacije nad korisnicima (KORISNIK + KLIJENT / RADNIK).

Registracija je transakcijska: kreiramo redak u KORISNIK i pripadni profil
(KLIJENT ili RADNIK) te commitamo zajedno. Ako profil padne, KORISNIK se ne
smije spremiti — zato jedan `commit` na kraju.
"""

from fastapi import HTTPException, status
from sqlmodel import Session, select

from core.security import hash_password
from models.korisnik import KLIJENT, KORISNIK, RADNIK, Uloga
from schemas.auth import RegisterKlijentIn, RegisterRadnikIn


def get_korisnik_by_email(session: Session, email: str) -> KORISNIK | None:
    """Dohvati korisnika po emailu (za prijavu i provjeru duplikata)."""
    return session.exec(select(KORISNIK).where(KORISNIK.email == email)).first()


def _ensure_email_free(session: Session, email: str) -> None:
    if get_korisnik_by_email(session, email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Korisnik s tim emailom već postoji.",
        )


def create_klijent(session: Session, data: RegisterKlijentIn) -> KORISNIK:
    """Kreiraj klijenta: KORISNIK (uloga=KLIJENT) + KLIJENT profil."""
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
    # flush da baza dodijeli korisnik_id prije kreiranja profila (dijele PK).
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
    """Kreiraj KORISNIK (sa zadanom ulogom) + pripadni RADNIK profil.

    Zajednička logika za radnika i admina: admin je i radnik (ima RADNIK profil),
    samo mu je uloga ADMIN umjesto RADNIK.
    """
    _ensure_email_free(session, data.email)

    korisnik = KORISNIK(
        email=data.email,
        lozinka=hash_password(data.password),
        uloga=uloga,
    )
    session.add(korisnik)
    # flush da baza dodijeli korisnik_id prije kreiranja profila (dijele PK).
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
    """Kreiraj radnika: KORISNIK (uloga=RADNIK) + RADNIK profil."""
    return _create_korisnik_s_radnik_profilom(session, data, Uloga.RADNIK)


def create_admin(session: Session, data: RegisterRadnikIn) -> KORISNIK:
    """Kreiraj admina: KORISNIK (uloga=ADMIN) + RADNIK profil (admin je i radnik)."""
    return _create_korisnik_s_radnik_profilom(session, data, Uloga.ADMIN)
