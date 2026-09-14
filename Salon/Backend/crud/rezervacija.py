from datetime import date, datetime, time, timedelta

from fastapi import HTTPException, status
from sqlalchemy import delete, or_, text
from sqlmodel import Session, select

from core.config import settings
from crud.usluga import _veza_radnik_usluga, get_radnik_or_404, get_usluga_or_404
from models.korisnik import KORISNIK, Uloga
from models.radno_vrijeme import RADNO_VRIJEME
from models.rezervacija import REZERVACIJA, StatusRezervacije
from schemas.rezervacija import RezervacijaCreate, RezervacijaOut

def obrisi_istekle(session: Session, radnik_id: int | None = None) -> None:
    """Privremeno držanje koje nije potvrđeno u roku briše se — termin je opet slobodan.

    Takav zapis nije rezervacija nego samo trag neuspjelog pokušaja, pa se ne čuva.
    """
    stmt = delete(REZERVACIJA).where(
        REZERVACIJA.status == StatusRezervacije.NEPOTVRDJENA,
        REZERVACIJA.rezervirano_do <= datetime.now(),
    )
    if radnik_id is not None:
        stmt = stmt.where(REZERVACIJA.radnik_id == radnik_id)

    rezultat = session.execute(stmt)
    if rezultat.rowcount:
        session.commit()

def _zakljucaj_raspored_radnika(session: Session, radnik_id: int) -> None:
    session.execute(
        text("SELECT pg_advisory_xact_lock(:kljuc)"), {"kljuc": int(radnik_id)}
    )

def _zauzima_termin():
    return or_(
        REZERVACIJA.status == StatusRezervacije.AKTIVNA,
        (REZERVACIJA.status == StatusRezervacije.NEPOTVRDJENA)
        & (REZERVACIJA.rezervirano_do > datetime.now()),
    )

def _provjeri_radno_vrijeme(
    session: Session, radnik_id: int, pocetak: datetime, kraj: datetime
) -> None:
    dan = pocetak.isoweekday()
    intervali = session.exec(
        select(RADNO_VRIJEME).where(
            RADNO_VRIJEME.radnik_id == radnik_id,
            RADNO_VRIJEME.dan_u_tjednu == dan,
        )
    ).all()
    stane = any(
        pocetak.time() >= rv.vrijeme_od and kraj.time() <= rv.vrijeme_do
        for rv in intervali
    )
    if not stane:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Termin je izvan radnog vremena radnika.",
        )

def _provjeri_preklapanje(
    session: Session,
    radnik_id: int,
    pocetak: datetime,
    kraj: datetime,
    *,
    izuzmi_id: int | None = None,
) -> None:
    stmt = select(REZERVACIJA).where(
        REZERVACIJA.radnik_id == radnik_id,
        REZERVACIJA.pocetak < kraj,
        REZERVACIJA.kraj > pocetak,
        _zauzima_termin(),
    )
    if izuzmi_id is not None:
        stmt = stmt.where(REZERVACIJA.rezervacija_id != izuzmi_id)

    sukob = session.exec(stmt).first()
    if sukob is None:
        return

    if sukob.status == StatusRezervacije.NEPOTVRDJENA:
        detail = (
            "Termin je privremeno rezerviran i čeka potvrdu drugog klijenta. "
            "Pokušajte ponovno kasnije ili odaberite drugi termin."
        )
    else:
        detail = "Radnik već ima rezervaciju u tom terminu."
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)

def create_rezervacija(
    session: Session, klijent_id: int, data: RezervacijaCreate
) -> REZERVACIJA:
    usluga = get_usluga_or_404(session, data.usluga_id)
    get_radnik_or_404(session, data.radnik_id)

    if _veza_radnik_usluga(session, data.radnik_id, data.usluga_id) is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Radnik ne nudi odabranu uslugu.",
        )

    if data.pocetak < datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Termin ne može biti u prošlosti.",
        )

    kraj = data.pocetak + timedelta(minutes=usluga.trajanje)
    _provjeri_radno_vrijeme(session, data.radnik_id, data.pocetak, kraj)

    obrisi_istekle(session, data.radnik_id)
    _zakljucaj_raspored_radnika(session, data.radnik_id)
    _provjeri_preklapanje(session, data.radnik_id, data.pocetak, kraj)

    rezervacija = REZERVACIJA(
        klijent_id=klijent_id,
        radnik_id=data.radnik_id,
        usluga_id=data.usluga_id,
        pocetak=data.pocetak,
        kraj=kraj,
        status=StatusRezervacije.NEPOTVRDJENA,
        napomena=data.napomena,
        rezervirano_do=datetime.now()
        + timedelta(minutes=settings.rezervacija_rok_potvrde_minuta),
    )
    session.add(rezervacija)
    session.commit()
    session.refresh(rezervacija)
    return rezervacija

def potvrdi_rezervaciju(
    session: Session, rezervacija_id: int, korisnik: KORISNIK
) -> REZERVACIJA:
    rezervacija = get_rezervacija_za_korisnika(session, rezervacija_id, korisnik)

    if korisnik.uloga == Uloga.RADNIK:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rezervaciju potvrđuje klijent koji ju je kreirao.",
        )

    if rezervacija.status == StatusRezervacije.AKTIVNA:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Rezervacija je već potvrđena.",
        )
    if rezervacija.status == StatusRezervacije.OTKAZANA:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Otkazana rezervacija se ne može potvrditi.",
        )
    if (
        rezervacija.rezervirano_do is None
        or rezervacija.rezervirano_do <= datetime.now()
    ):
        session.delete(rezervacija)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Rok za potvrdu ({settings.rezervacija_rok_potvrde_minuta} min) "
                "je istekao, termin je oslobođen."
            ),
        )

    obrisi_istekle(session, rezervacija.radnik_id)
    _zakljucaj_raspored_radnika(session, rezervacija.radnik_id)
    _provjeri_preklapanje(
        session,
        rezervacija.radnik_id,
        rezervacija.pocetak,
        rezervacija.kraj,
        izuzmi_id=rezervacija.rezervacija_id,
    )

    rezervacija.status = StatusRezervacije.AKTIVNA
    rezervacija.rezervirano_do = None
    session.add(rezervacija)
    session.commit()
    session.refresh(rezervacija)
    return rezervacija

def zauzeti_termini(session: Session, radnik_id: int, datum: date) -> list[REZERVACIJA]:
    get_radnik_or_404(session, radnik_id)
    obrisi_istekle(session, radnik_id)

    dan_od = datetime.combine(datum, time.min)
    stmt = (
        select(REZERVACIJA)
        .where(
            REZERVACIJA.radnik_id == radnik_id,
            REZERVACIJA.pocetak >= dan_od,
            REZERVACIJA.pocetak < dan_od + timedelta(days=1),
            _zauzima_termin(),
        )
        .order_by(REZERVACIJA.pocetak)
    )
    return list(session.exec(stmt).all())

def list_rezervacije_za_korisnika(
    session: Session,
    korisnik: KORISNIK,
    *,
    status_filter: StatusRezervacije | None = None,
    datum: date | None = None,
    radnik_id: int | None = None,
    klijent_id: int | None = None,
) -> list[REZERVACIJA]:
    obrisi_istekle(session)

    stmt = select(REZERVACIJA).order_by(REZERVACIJA.pocetak)

    if korisnik.uloga == Uloga.KLIJENT:
        stmt = stmt.where(REZERVACIJA.klijent_id == korisnik.korisnik_id)
    elif korisnik.uloga == Uloga.RADNIK:
        stmt = stmt.where(REZERVACIJA.radnik_id == korisnik.korisnik_id)
    elif korisnik.uloga == Uloga.ADMIN:
        if radnik_id is not None:
            stmt = stmt.where(REZERVACIJA.radnik_id == radnik_id)
        if klijent_id is not None:
            stmt = stmt.where(REZERVACIJA.klijent_id == klijent_id)

    if status_filter is not None:
        stmt = stmt.where(REZERVACIJA.status == status_filter)
    if datum is not None:
        dan_od = datetime.combine(datum, time.min)
        stmt = stmt.where(
            REZERVACIJA.pocetak >= dan_od,
            REZERVACIJA.pocetak < dan_od + timedelta(days=1),
        )

    return list(session.exec(stmt).all())

def get_rezervacija_za_korisnika(
    session: Session, rezervacija_id: int, korisnik: KORISNIK
) -> REZERVACIJA:
    rezervacija = session.get(REZERVACIJA, rezervacija_id)
    if rezervacija is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Rezervacija ne postoji."
        )
    if not _smije_pristupiti(rezervacija, korisnik):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nemate pristup toj rezervaciji.",
        )
    return rezervacija

def otkazi_rezervaciju(
    session: Session, rezervacija_id: int, korisnik: KORISNIK
) -> REZERVACIJA | RezervacijaOut:
    rezervacija = get_rezervacija_za_korisnika(session, rezervacija_id, korisnik)
    if rezervacija.status == StatusRezervacije.OTKAZANA:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Rezervacija je već otkazana.",
        )

    if rezervacija.status == StatusRezervacije.NEPOTVRDJENA:
        # Klijent je odustao prije nego što je rezervacija potvrđena (plaćena) —
        # to se tretira jednako kao istek roka za potvrdu: zapis se briše bez
        # traga (vidi obrisi_istekle), termin je odmah opet slobodan.
        odgovor = RezervacijaOut.model_validate(rezervacija)
        session.delete(rezervacija)
        session.commit()
        return odgovor.model_copy(
            update={"status": StatusRezervacije.OTKAZANA, "rezervirano_do": None}
        )

    rezervacija.status = StatusRezervacije.OTKAZANA
    rezervacija.rezervirano_do = None
    session.add(rezervacija)
    session.commit()
    session.refresh(rezervacija)
    return rezervacija

def _smije_pristupiti(rezervacija: REZERVACIJA, korisnik: KORISNIK) -> bool:
    if korisnik.uloga == Uloga.ADMIN:
        return True
    if korisnik.uloga == Uloga.KLIJENT:
        return rezervacija.klijent_id == korisnik.korisnik_id
    if korisnik.uloga == Uloga.RADNIK:
        return rezervacija.radnik_id == korisnik.korisnik_id
    return False
