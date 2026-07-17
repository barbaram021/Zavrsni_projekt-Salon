from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlmodel import Session

from Backend.db.session import get_session

app = FastAPI()


@app.get("/health/db")
def health_db(session: Session = Depends(get_session)):
    """Provjera spoja na bazu — izvrši SELECT 1."""
    session.exec(text("SELECT 1"))
    return {"database": "ok"}
