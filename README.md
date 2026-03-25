# Studio Timer

Minimalistisk studioklocka för sändningsbruk. Visar stor, tydlig tid på mörk bakgrund — perfekt att köra i helskärm på en studioskärm.

## Funktioner

- **Faser** — pre-show nedräkning → sändning → idle med tydliga visuella övergångar
- **Tre visningslägen** — uppräkning (elapsed), nedräkning (countdown), klocka (clock)
- **Paus/återupptagning** — med valfri nedräkning innan återupptagning
- **Färgkodning** — vit normalt, gul varning, röd fara med pulsanimering
- **Live-indikator** — röd prick + LIVE-text under sändning, typande prickar vid paus
- **Stream Deck / Companion** — styrs via enkla HTTP-anrop
- **Admin-panel** — lösenordsskyddad, kontrollpanel med alla funktioner
- **Realtidssynk** — alla anslutna skärmar uppdateras direkt via WebSocket

## Installation

```bash
npm install
npm start
```

Servern startar på port 4000 (ändra med `PORT=XXXX npm start`).

| URL | Funktion |
|---|---|
| `http://localhost:4000/` | Timer-display (fullskärm) |
| `http://localhost:4000/admin.html` | Admin-panel |

## Admin-panel

Admin-panelen är lösenordsskyddad via HTTP Basic Auth. Sätt miljövariabeln `ADMIN_PASS` till önskat lösenord. Om variabeln saknas är panelen öppen (praktiskt lokalt).

```bash
ADMIN_PASS=hemligt
```

## API — Stream Deck / Companion

Alla endpoints svarar med JSON och använder GET.

### Sändningskontroll

| Endpoint | Funktion |
|---|---|
| `/api/preshow/start` | Starta pre-show nedräkning |
| `/api/preshow/start?seconds=N` | Starta pre-show med N sekunders nedräkning |
| `/api/broadcast/start` | Starta sändning direkt |
| `/api/broadcast/pause` | Pausa sändning |
| `/api/broadcast/resume` | Återuppta sändning (30s nedräkning som default) |
| `/api/broadcast/resume?seconds=N` | Återuppta med N sekunders nedräkning |
| `/api/broadcast/stop` | Avsluta sändning |

### Visningsläge

| Endpoint | Funktion |
|---|---|
| `/api/mode?mode=elapsed` | Visa uppräkning (default) |
| `/api/mode?mode=countdown` | Visa nedräkning mot satt segment-tid |
| `/api/mode?mode=clock` | Visa lokal klocka |

### Segment-timer (countdown-läge)

| Endpoint | Funktion |
|---|---|
| `/api/set?minutes=N` | Ställ in segment-tid |
| `/api/start` | Starta segment-timer |
| `/api/stop` | Stoppa segment-timer |
| `/api/reset` | Återställ segment-timer |
| `/api/status` | Hämta aktuell status |

## Deploy

Appen kräver persistent process och WebSocket-stöd — använd t.ex. **Railway** eller **Render**.

På Railway: koppla GitHub-repot, sätt miljövariabeln `ADMIN_PASS` under tjänstens Variables.
