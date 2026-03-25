# Studio Timer

Minimalistisk nedräknare för studiobruk. Visar stor, tydlig tid på mörk bakgrund — perfekt att köra i helskärm på en studioskärm.

## Funktioner

- **Stor, avskalad display** — mörk bakgrund, digitala siffror
- **Smart visning** — visar bara minuter tills sista minuten, då visas sekunder
- **Färgkodning** — vit normalt, gul sista minuten, röd vid övertid
- **Övertidsvisning** — fortsätter räkna uppåt med +MM:SS
- **Stream Deck / Companion** — styrs via enkla HTTP-anrop
- **Admin-panel** — webbgränssnitt för snabbval och kontroll
- **Realtidssynk** — alla anslutna skärmar uppdateras direkt via WebSocket

## Installation

```bash
npm install
```

## Starta

```bash
npm start
```

Servern startar på port 4000 (ändra med `PORT=XXXX npm start`).

## Användning

| URL | Funktion |
|---|---|
| `http://localhost:4000/` | Timer-display (fullskärm) |
| `http://localhost:4000/admin.html` | Admin-panel |

## API — Companion / Stream Deck

Alla endpoints svarar med JSON och använder GET:

| Endpoint | Funktion |
|---|---|
| `/api/start` | Starta nedräkningen |
| `/api/stop` | Pausa nedräkningen |
| `/api/toggle` | Toggla start/stopp |
| `/api/reset` | Återställ till senast satta tid |
| `/api/set?minutes=N` | Ställ in ny tid (N minuter) |
| `/api/status` | Hämta aktuell status |

### Companion-setup

1. Lägg till en **Generic HTTP** -modul i Companion
2. Peka den mot `http://<datorns-ip>:4000`
3. Skapa knappar med actions som anropar endpointsen ovan

**Exempel:** En knapp som sätter 15 minuter och startar:
- Action 1: GET `http://localhost:4000/api/set?minutes=15`
- Action 2: GET `http://localhost:4000/api/start`
