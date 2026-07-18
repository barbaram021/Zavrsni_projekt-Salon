"""Sigurnosne pomoćne funkcije: hashiranje lozinki (bcrypt) i JWT tokeni.

Stateless autentifikacija — poslužitelj ne pamti sesije. Klijent u svakom
zahtjevu šalje access token (JWT) koji ovdje kreiramo i provjeravamo.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from core.config import settings


def hash_password(plain_password: str) -> str:
    """Vrati bcrypt hash lozinke (za spremanje u KORISNIK.lozinka)."""
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Provjeri odgovara li unesena lozinka spremljenom hashu."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def create_access_token(subject: int, uloga: str) -> str:
    """Kreiraj potpisani JWT access token.

    `sub` je korisnik_id (kao string, prema JWT konvenciji), a `uloga` nosimo
    kao dodatni claim kako bismo autorizaciju mogli provjeriti bez upita u bazu.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(subject),
        "uloga": uloga,
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict:
    """Dekodiraj i provjeri JWT; diže `jwt.PyJWTError` ako je nevaljan/istekao."""
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
