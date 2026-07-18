"""FastAPI aplikacija salona: konfiguracija, CORS i registracija routera."""

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlmodel import Session

from api.routers import auth, radnici
from db.session import get_session

app = FastAPI(title="Salon API")

# CORS — dopušta pozive iz frontend aplikacije (u razvoju otvoreno).
# U produkciji suziti allow_origins na stvarnu domenu frontenda.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(radnici.router)


@app.get("/health/db")
def health_db(session: Session = Depends(get_session)):
    """Provjera spoja na bazu — izvrši SELECT 1."""
    session.exec(text("SELECT 1"))
    return {"database": "ok"}
