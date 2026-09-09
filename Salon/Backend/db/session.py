from collections.abc import Generator

from sqlmodel import Session, create_engine

from core.config import settings

engine = create_engine(
    settings.database_url,
    echo=True,
    pool_pre_ping=True,
)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
