"""Spajanje na bazu: engine i sesija.

Sinkroni SQLModel engine i `get_session` dependency koji ostatak aplikacije
koristi preko FastAPI `Depends(get_session)`. Shema baze (tablice) izrađuje se
zasebno — ovdje se NE kreiraju tablice.
"""

from collections.abc import Generator

from sqlmodel import Session, create_engine

from Backend.core.config import settings

# echo=True ispisuje SQL u konzolu (korisno tijekom razvoja).
# pool_pre_ping=True provjeri konekciju prije korištenja da mrtve konekcije
# (npr. nakon prekida veze) ne sruše zahtjev.
engine = create_engine(
    settings.database_url,
    echo=True,
    pool_pre_ping=True,
)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency: daje DB sesiju po zahtjevu i zatvara je na kraju."""
    with Session(engine) as session:
        yield session
