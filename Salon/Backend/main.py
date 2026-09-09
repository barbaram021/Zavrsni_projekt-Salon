from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlmodel import Session

from api.routers import (
    auth,
    klijenti,
    radnici,
    radno_vrijeme,
    rezervacije,
    usluge,
)
from db.session import get_session

app = FastAPI(title="Salon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(radnici.router)
app.include_router(klijenti.router)
app.include_router(usluge.router)
app.include_router(usluge.radnik_router)
app.include_router(radno_vrijeme.router)
app.include_router(rezervacije.router)

@app.get("/health/db")
def health_db(session: Session = Depends(get_session)):
    session.exec(text("SELECT 1"))
    return {"database": "ok"}
