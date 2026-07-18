"""Autentifikacijske i autorizacijske ovisnosti (FastAPI Depends).

- `get_current_user` — dohvaća prijavljenog korisnika iz JWT-a (401 ako nevaljan).
- `require_role(*uloge)` — tvornica ovisnosti koja provjerava ulogu (403 ako nema
  dopuštenja). Time endpoint dobiva različit pristup ovisno o ulozi korisnika.
"""

from collections.abc import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from core.security import decode_access_token
from db.session import get_session
from models.korisnik import KORISNIK, Uloga

# tokenUrl mora odgovarati putanji login endpointa (za "Authorize" u /docs).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Nevaljane ili istekle vjerodajnice.",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> KORISNIK:
    """Dekodiraj token, dohvati i vrati pripadnog korisnika iz baze."""
    try:
        payload = decode_access_token(token)
        korisnik_id = payload.get("sub")
        if korisnik_id is None:
            raise _CREDENTIALS_EXC
    except jwt.PyJWTError:
        raise _CREDENTIALS_EXC

    korisnik = session.get(KORISNIK, int(korisnik_id))
    if korisnik is None:
        raise _CREDENTIALS_EXC
    return korisnik


def require_role(*uloge: Uloga) -> Callable[[KORISNIK], KORISNIK]:
    """Vrati ovisnost koja propušta samo korisnike s jednom od `uloge`.

    Hijerarhija: ADMIN je ujedno i radnik, pa prolazi i svaki endpoint zaštićen
    za RADNIK-a. Time radnički endpointi (`require_role(Uloga.RADNIK)`) rade i za
    admina bez ručnog dodavanja ADMIN-a svugdje.
    """

    def _checker(current_user: KORISNIK = Depends(get_current_user)) -> KORISNIK:
        dopusteno = current_user.uloga in uloge or (
            current_user.uloga == Uloga.ADMIN and Uloga.RADNIK in uloge
        )
        if not dopusteno:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Nemate ovlasti za ovu radnju.",
            )
        return current_user

    return _checker
