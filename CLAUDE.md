# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Kommandon

```bash
npm install   # Installera dependencies
npm start     # Starta servern på port 4000 (eller PORT-env-variabel)
```

Ingen test- eller lint-konfiguration finns i projektet.

## Arkitektur

**Studio Timer** är en minimalistisk webbapp för nedräkning i studiomiljöer med tre filer:

- **`server.js`** — Express 5 + WebSocket-server. Håller timer-state i minnet (totalSeconds, remainingSeconds, running, overtime). Kör ett 1-sekunders intervall som tickar ned och broadcastar state till alla anslutna WebSocket-klienter. REST API använder genomgående GET-requests för enkel integration med Companion/Stream Deck.
- **`index.html`** — Fullskärmsvisning för storskärm. Visar bara minuter tills sista minuten (då MM:SS), färgskiftar vit→gul→röd, pulsanimering vid övertid, liten blinkande prick vid pausläge.
- **`admin.html`** — Kontrollpanel med snabbval (5–60 min), anpassad tid, start/stopp/reset och API-dokumentation.

Både frontend-filer ansluter via WebSocket för realtidssynk och faller tillbaka till reconnect efter 2 sekunder vid avbrott.

## API

Alla endpoints returnerar JSON och svarar på GET:

| Endpoint | Funktion |
|---|---|
| `/api/set?minutes=N` | Ställ in tid |
| `/api/start` | Starta |
| `/api/stop` | Pausa |
| `/api/toggle` | Toggla start/stopp |
| `/api/reset` | Återställ till senast satt tid |
| `/api/status` | Hämta aktuell state |

## Teknisk stack

Node.js + Express 5, WebSocket (`ws`), vanilla HTML/CSS/JS. Inga byggsteg — filerna serveras direkt från rotkatalogen via `express.static('.')`.
