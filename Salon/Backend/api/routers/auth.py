"""Router za autentifikaciju: registracija klijenta, prijava i profil."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session

from api.deps import get_current_user
from core.security import create_access_token, verify_password
from crud.korisnik import create_klijent, get_korisnik_by_email
from db.session import get_session
from models.korisnik import KORISNIK
from schemas.auth import KorisnikOut, RegisterKlijentIn, Token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=KorisnikOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registracija novog klijenta",
)
def register_klijent(
    data: RegisterKlijentIn,
    session: Session = Depends(get_session),
) -> KORISNIK:
    """Javna registracija — kreira korisnički račun uloge KLIJENT + profil."""
    return create_klijent(session, data)


@router.post("/login", response_model=Token, summary="Prijava (dobivanje tokena)")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
) -> Token:
    """Provjeri email (polje `username`) i lozinku te vrati JWT access token."""
    korisnik = get_korisnik_by_email(session, form_data.username)
    if korisnik is None or not verify_password(form_data.password, korisnik.lozinka):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Pogrešan email ili lozinka.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        subject=korisnik.korisnik_id, uloga=korisnik.uloga.value
    )
    return Token(access_token=access_token)


@router.get("/me", response_model=KorisnikOut, summary="Podaci prijavljenog korisnika")
def read_me(current_user: KORISNIK = Depends(get_current_user)) -> KORISNIK:
    """Vrati račun trenutno prijavljenog korisnika (na temelju tokena)."""
    return current_user
