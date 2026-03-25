const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- State ---
let state = {
  phase: 'idle',           // 'idle' | 'preshow' | 'broadcast'
  displayMode: 'elapsed',  // 'elapsed' | 'countdown' | 'clock'

  preshowTotal: 30,
  preshowRemaining: 30,

  elapsedSeconds: 0,
  broadcastPaused: false,
  resumeTotal: 10,
  resumeRemaining: 10,

  segmentTotal: 600,
  segmentRemaining: 600,
  segmentRunning: false,
  segmentOvertime: false,
};

let intervalId = null;

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

function getState() {
  const { phase, displayMode, preshowTotal, preshowRemaining, elapsedSeconds,
    broadcastPaused, resumeTotal, resumeRemaining,
    segmentTotal, segmentRemaining, segmentRunning, segmentOvertime } = state;
  return { type: 'state', phase, displayMode, preshowTotal, preshowRemaining,
    elapsedSeconds, broadcastPaused, resumeTotal, resumeRemaining,
    segmentTotal, segmentRemaining, segmentRunning, segmentOvertime };
}

function tick() {
  if (state.phase === 'preshow') {
    state.preshowRemaining--;
    if (state.preshowRemaining <= 0) {
      state.preshowRemaining = 0;
      state.phase = 'broadcast';
      state.elapsedSeconds = 0;
      state.segmentRunning = true;
    }
  } else if (state.phase === 'resuming') {
    state.resumeRemaining--;
    if (state.resumeRemaining <= 0) {
      state.resumeRemaining = 0;
      state.phase = 'broadcast';
      state.broadcastPaused = false;
      state.segmentRunning = true;
    }
  } else if (state.phase === 'broadcast' && !state.broadcastPaused) {
    state.elapsedSeconds++;
    if (state.segmentRunning) {
      state.segmentRemaining--;
      if (state.segmentRemaining < 0) state.segmentOvertime = true;
    }
  }
  broadcast(getState());
}

function startInterval() {
  if (!intervalId) intervalId = setInterval(tick, 1000);
}

function stopInterval() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

function startPreshow() {
  if (state.phase !== 'idle') return;
  state.preshowRemaining = state.preshowTotal;
  state.phase = 'preshow';
  startInterval();
  broadcast(getState());
}

function startBroadcast() {
  stopInterval();
  state.phase = 'broadcast';
  state.elapsedSeconds = 0;
  state.segmentRunning = true;
  startInterval();
  broadcast(getState());
}

function stopBroadcast() {
  stopInterval();
  state.phase = 'idle';
  state.broadcastPaused = false;
  state.segmentRunning = false;
  broadcast(getState());
}

function pauseBroadcast() {
  if (state.phase !== 'broadcast') return;
  state.broadcastPaused = true;
  broadcast(getState());
}

function resumeDirect() {
  if (state.phase !== 'broadcast' && state.phase !== 'resuming') return;
  state.phase = 'broadcast';
  state.broadcastPaused = false;
  state.segmentRunning = true;
  broadcast(getState());
}

function setResumeDuration(seconds) {
  state.resumeTotal = seconds;
  if (state.phase !== 'resuming') state.resumeRemaining = seconds;
  broadcast(getState());
}

function startResumeCountdown() {
  if (state.phase !== 'broadcast' || !state.broadcastPaused) return;
  state.resumeRemaining = state.resumeTotal;
  state.phase = 'resuming';
  broadcast(getState());
}

function setDisplayMode(mode) {
  if (!['elapsed', 'countdown', 'clock'].includes(mode)) return;
  state.displayMode = mode;
  broadcast(getState());
}

function setPreshowDuration(seconds) {
  state.preshowTotal = seconds;
  if (state.phase !== 'preshow') state.preshowRemaining = seconds;
  broadcast(getState());
}

function setSegment(minutes) {
  state.segmentTotal = minutes * 60;
  state.segmentRemaining = minutes * 60;
  state.segmentOvertime = false;
  broadcast(getState());
}

function startSegment() {
  state.segmentRunning = true;
  broadcast(getState());
}

function stopSegment() {
  state.segmentRunning = false;
  broadcast(getState());
}

function resetSegment(minutes) {
  state.segmentRunning = false;
  const secs = (minutes || Math.ceil(state.segmentTotal / 60)) * 60;
  state.segmentTotal = secs;
  state.segmentRemaining = secs;
  state.segmentOvertime = false;
  broadcast(getState());
}

// --- Admin auth ---
const ADMIN_PASS = process.env.ADMIN_PASS;
app.use('/admin.html', (req, res, next) => {
  if (!ADMIN_PASS) return next();
  const auth = req.headers.authorization;
  if (auth) {
    const [, b64] = auth.split(' ');
    const [, pass] = Buffer.from(b64, 'base64').toString().split(':');
    if (pass === ADMIN_PASS) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Studio Admin"');
  res.status(401).send('Unauthorized');
});

// --- Static files ---
app.use(express.static(__dirname));

// --- Pre-show API ---
app.get('/api/preshow/set', (req, res) => {
  const seconds = parseInt(req.query.seconds);
  if (!seconds || seconds < 1) return res.status(400).json({ ok: false, error: 'Ange ?seconds=N' });
  setPreshowDuration(seconds);
  res.json({ ok: true, ...getState() });
});

app.get('/api/preshow/start', (req, res) => {
  const seconds = parseInt(req.query.seconds);
  if (seconds && seconds >= 1) setPreshowDuration(seconds);
  startPreshow();
  res.json({ ok: true, ...getState() });
});

// --- Broadcast API ---
app.get('/api/broadcast/start', (req, res) => {
  startBroadcast();
  res.json({ ok: true, ...getState() });
});

app.get('/api/broadcast/stop', (req, res) => {
  stopBroadcast();
  res.json({ ok: true, ...getState() });
});

app.get('/api/broadcast/pause', (req, res) => {
  pauseBroadcast();
  res.json({ ok: true, ...getState() });
});

app.get('/api/broadcast/resume', (req, res) => {
  const seconds = parseInt(req.query.seconds) || 30;
  setResumeDuration(seconds);
  startResumeCountdown();
  res.json({ ok: true, ...getState() });
});

app.get('/api/mode', (req, res) => {
  setDisplayMode(req.query.mode);
  res.json({ ok: true, ...getState() });
});

;

// --- Segment API (backward-compatible) ---
app.get('/api/set', (req, res) => {
  const minutes = parseInt(req.query.minutes);
  if (!minutes || minutes < 1) return res.status(400).json({ ok: false, error: 'Ange ?minutes=N' });
  setSegment(minutes);
  res.json({ ok: true, ...getState() });
});

app.get('/api/start', (req, res) => {
  startSegment();
  res.json({ ok: true, ...getState() });
});

app.get('/api/stop', (req, res) => {
  stopSegment();
  res.json({ ok: true, ...getState() });
});

app.get('/api/toggle', (req, res) => {
  state.segmentRunning ? stopSegment() : startSegment();
  res.json({ ok: true, ...getState() });
});

app.get('/api/reset', (req, res) => {
  const minutes = parseInt(req.query.minutes) || undefined;
  resetSegment(minutes);
  res.json({ ok: true, ...getState() });
});

app.get('/api/status', (req, res) => {
  res.json({ ok: true, ...getState() });
});

// --- WebSocket ---
wss.on('connection', (ws) => {
  ws.send(JSON.stringify(getState()));
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      switch (msg.action) {
        case 'preshow.set': if (msg.seconds) setPreshowDuration(msg.seconds); break;
        case 'preshow.start': startPreshow(); break;
        case 'broadcast.start': startBroadcast(); break;
        case 'broadcast.stop': stopBroadcast(); break;
        case 'broadcast.pause': pauseBroadcast(); break;
        case 'resume.direct': resumeDirect(); break;
        case 'resume.set': if (msg.seconds) setResumeDuration(msg.seconds); break;
        case 'resume.countdown': startResumeCountdown(); break;
        case 'mode': if (msg.mode) setDisplayMode(msg.mode); break;
        case 'segment.set': if (msg.minutes) setSegment(msg.minutes); break;
        case 'segment.start': startSegment(); break;
        case 'segment.stop': stopSegment(); break;
        case 'segment.reset': resetSegment(msg.minutes); break;
        // backward compat
        case 'start': startSegment(); break;
        case 'stop': stopSegment(); break;
        case 'toggle': state.segmentRunning ? stopSegment() : startSegment(); break;
        case 'reset': resetSegment(msg.minutes); break;
        case 'set': if (msg.minutes) setSegment(msg.minutes); break;
      }
    } catch (e) {}
  });
});

// --- Start ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Studio Timer körs på port ${PORT}`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Timer-display:  http://localhost:${PORT}/`);
  console.log(`  Admin-panel:    http://localhost:${PORT}/admin.html`);
  console.log(`\n  Companion / Stream Deck endpoints:`);
  console.log(`  GET /api/preshow/set?seconds=N   Sätt pre-show tid`);
  console.log(`  GET /api/preshow/start           Starta pre-show nedräkning`);
  console.log(`  GET /api/broadcast/start         Starta sändning direkt`);
  console.log(`  GET /api/broadcast/stop          Avsluta sändning`);
  console.log(`  GET /api/mode?mode=X             Visningsläge (elapsed/countdown/clock)`);
  console.log(`  GET /api/set?minutes=N           Sätt segment-tid`);
  console.log(`  GET /api/start                   Starta segment-timer`);
  console.log(`  GET /api/stop                    Stoppa segment-timer`);
  console.log(`  GET /api/toggle                  Toggla segment-timer`);
  console.log(`  GET /api/reset                   Återställ segment-timer`);
  console.log(`  GET /api/status                  Hämta aktuell status\n`);
});
