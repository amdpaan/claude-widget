#!/usr/bin/env node
// Collects everything the widget shows and prints it as one JSON object.
// Runs every 2 seconds from widget.jsx (via data.sh).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');
const { classesStatus } = require('../lib/classes.cjs');

const ROOT = path.resolve(__dirname, '..');
const HOME = os.homedir();
const CACHE = process.env.CLAUDE_WIDGET_CACHE || path.join(HOME, 'Library', 'Caches', 'claude-widget');
const USAGE_FILE = path.join(HOME, '.claude', 'usage.json');
const CCUSAGE_TTL_MS = 5 * 60 * 1000;
const USAGE_TTL_MS = 3 * 60 * 1000;

fs.mkdirSync(CACHE, { recursive: true });

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJSON(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}

function safe(fn) {
  try {
    return fn();
  } catch (e) {
    return { error: String(e.message || e).split('\n')[0] };
  }
}

// ---------- Music ----------

const MUSIC_SCRIPT = `
if application "Music" is not running then return "NOT_RUNNING"
tell application "Music"
  set ps to player state as string
  if ps is "stopped" then return "STOPPED"
  set trk to current track
  return ps & tab & (name of trk) & tab & (artist of trk) & tab & (album of trk)
end tell`;

function artworkScript(file) {
  return `
tell application "Music"
  if (count of artworks of current track) is 0 then return "NONE"
  set d to raw data of artwork 1 of current track
end tell
set f to open for access (POSIX file "${file}") with write permission
set eof f to 0
write d to f
close access f
return "OK"`;
}

function osa(script) {
  return execFileSync('osascript', ['-e', script], { encoding: 'utf8', timeout: 4000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

// Exports the current track's artwork once per track and caches it as a small data URI.
function artwork(key) {
  const metaFile = path.join(CACHE, 'artwork.json');
  const cached = readJSON(metaFile);
  if (cached && cached.key === key) return cached.dataUri;

  let dataUri = null;
  const raw = path.join(CACHE, 'artwork.raw');
  const jpg = path.join(CACHE, 'artwork.jpg');
  try {
    if (osa(artworkScript(raw)) === 'OK') {
      execFileSync('sips', ['-s', 'format', 'jpeg', '-Z', '160', raw, '--out', jpg], { stdio: 'ignore', timeout: 4000 });
      dataUri = `data:image/jpeg;base64,${fs.readFileSync(jpg).toString('base64')}`;
    }
  } catch {
    // No artwork (e.g. some streamed tracks); the widget shows a placeholder.
  }
  writeJSON(metaFile, { key, dataUri });
  return dataUri;
}

function music() {
  const out = osa(MUSIC_SCRIPT);
  if (out === 'NOT_RUNNING' || out === 'STOPPED') return null;
  const [state, title, artist, album] = out.split('\t');
  return { state, title, artist, album, art: artwork(`${title}\u0000${artist}\u0000${album}`) };
}

// ---------- System ----------

function cpu() {
  const sample = os.cpus().reduce(
    (acc, c) => {
      const t = c.times;
      acc.idle += t.idle;
      acc.total += t.user + t.nice + t.sys + t.idle + t.irq;
      return acc;
    },
    { idle: 0, total: 0 }
  );
  const file = path.join(CACHE, 'cpu.json');
  const prev = readJSON(file);
  writeJSON(file, sample);
  if (!prev || sample.total <= prev.total) return null;
  return 100 * (1 - (sample.idle - prev.idle) / (sample.total - prev.total));
}

// "Memory Used" as Activity Monitor computes it: app memory + wired + compressed.
function memory() {
  const out = execFileSync('vm_stat', { encoding: 'utf8' });
  const pageSize = Number((out.match(/page size of (\d+) bytes/) || [])[1] || 16384);
  const pages = (label) => Number((out.match(new RegExp(`${label}:\\s+(\\d+)`)) || [])[1] || 0);
  const app = pages('Anonymous pages') - pages('Pages purgeable');
  const used = (app + pages('Pages wired down') + pages('Pages occupied by compressor')) * pageSize;
  return { used, total: os.totalmem() };
}

// ---------- Claude ----------

// resets_at is epoch seconds in Claude Code's status line input; accept ms or ISO too.
function toMs(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v;
  if (/^\d+$/.test(String(v))) return toMs(Number(v));
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

function mtimeAge(file) {
  try {
    return Date.now() - fs.statSync(file).mtimeMs;
  } catch {
    return Infinity;
  }
}

// usage.json is written by the status line (CLI sessions only) and by usage-refresh.sh,
// which runs in the background when the data is older than 3 minutes. The stamp file
// stops it retrying every 2 s when the call keeps failing.
function refreshLimits(u) {
  const updated = u ? toMs(u.updated_at) : null;
  if (updated && Date.now() - updated < USAGE_TTL_MS) return;
  const stamp = path.join(CACHE, 'usage-refresh.stamp');
  const lock = path.join(CACHE, 'usage-refresh.lock');
  if (mtimeAge(stamp) < USAGE_TTL_MS || mtimeAge(lock) < 60 * 1000) return;
  fs.writeFileSync(stamp, '');
  fs.writeFileSync(lock, String(process.pid));
  spawn(path.join(ROOT, 'bin', 'usage-refresh.sh'), [USAGE_FILE, lock], { detached: true, stdio: 'ignore' }).unref();
}

function claudeLimits() {
  const u = readJSON(USAGE_FILE);
  safe(() => refreshLimits(u));
  if (!u) return null;
  const win = (w) =>
    w && w.used_percentage != null ? { percent: Number(w.used_percentage), resetsAt: toMs(w.resets_at) } : null;
  return { fiveHour: win(u.five_hour), sevenDay: win(u.seven_day), updatedAt: toMs(u.updated_at) };
}

function todayKL() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
}

// Today's tokens/cost. `npx ccusage` is slow, so it runs in the background at most
// every 5 minutes and we read its last result from the cache.
function ccusage() {
  const file = path.join(CACHE, 'ccusage.json');
  const lock = path.join(CACHE, 'ccusage.lock');
  let age = Infinity;
  try {
    age = Date.now() - fs.statSync(file).mtimeMs;
  } catch {}
  let locked = false;
  try {
    locked = Date.now() - fs.statSync(lock).mtimeMs < 3 * 60 * 1000;
  } catch {}

  if (age > CCUSAGE_TTL_MS && !locked) {
    fs.writeFileSync(lock, String(process.pid));
    spawn(path.join(ROOT, 'bin', 'ccusage-refresh.sh'), [file, lock], { detached: true, stdio: 'ignore' }).unref();
  }

  const data = readJSON(file);
  if (!data) return { loading: true };
  const today = todayKL();
  const row = (data.daily || []).find((d) => (d.period || d.date) === today);
  // ccusage v20+ also counts other coding agents (Codex etc.); keep only Claude Code.
  const src = row && Array.isArray(row.agents) ? row.agents.find((a) => a.agent === 'claude') : row;
  return {
    tokens: src ? src.totalTokens || 0 : 0,
    cost: src ? src.totalCost || 0 : 0,
    fetchedAt: age === Infinity ? null : Date.now() - age,
  };
}

// ---------- Music Wrapped ----------

// summary.json is written by music-wrapped (github.com/amdpaan/music-wrapped) after every
// logged play and report, so this is just a file read.
const WRAPPED_DIR = path.join(HOME, 'Library', 'Application Support', 'music-wrapped');

// Monday of the current week (local time) as YYYY-MM-DD, like summary.json's week_start.
function weekStart(d = new Date()) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  const pad = (n) => String(n).padStart(2, '0');
  return `${m.getFullYear()}-${pad(m.getMonth() + 1)}-${pad(m.getDate())}`;
}

// music-wrapped caches 160 px covers as artwork/<track id>.jpg (about 8 KB). Sent as a data URI,
// the same way as the Now Playing artwork.
function cover(pid) {
  if (!pid || !/^[0-9A-F]{16}$/.test(pid)) return null;
  try {
    return `data:image/jpeg;base64,${fs.readFileSync(path.join(WRAPPED_DIR, 'artwork', `${pid}.jpg`)).toString('base64')}`;
  } catch {
    return null;
  }
}

function wrapped() {
  const s = readJSON(path.join(WRAPPED_DIR, 'summary.json'));
  if (!s) return null;
  // Clicking opens the reports home page (this week so far + every report); the weekly report if
  // there's no home page yet.
  const report = [path.join(WRAPPED_DIR, 'reports', 'index.html'), path.join(WRAPPED_DIR, 'reports', 'weekly', 'latest.html')]
    .find((f) => fs.existsSync(f)) || null;
  const base = { report, today: (new Date().getDay() + 6) % 7 };
  // The file is only rewritten when something is played, so on Monday it still holds last week.
  if (s.week_start !== weekStart()) {
    return { ...base, hours: 0, plays: 0, topArtist: null, topSong: null, topGenre: null, daily: null, art: null };
  }
  // Fields added in later music-wrapped versions may be missing from older summary files.
  const daily = Array.isArray(s.daily_minutes) && s.daily_minutes.length === 7 ? s.daily_minutes : null;
  return {
    ...base,
    hours: s.hours || 0,
    plays: s.plays || 0,
    topArtist: s.top_artist,
    topSong: s.top_song,
    topGenre: s.top_genre || null,
    daily,
    art: cover(s.top_song && s.top_song.pid),
  };
}

// ---------- Home network (net-watch) ----------

// summary.json is written by net-watch (github.com/amdpaan/net-watch) after every scan of the home
// network, so this is just a file read too.
const NETWATCH_DIR = path.join(HOME, 'Library', 'Application Support', 'net-watch');
const NETWATCH_AGENT = path.join(HOME, 'Library', 'LaunchAgents', 'com.netwatch.serve.plist');

function netwatch() {
  const s = readJSON(path.join(NETWATCH_DIR, 'summary.json'));
  if (!s) return null;
  const n = (v) => (Number.isFinite(v) ? v : 0);
  return {
    online: n(s.online),
    known: n(s.known),
    unknown: n(s.unknown),
    newToday: n(s.new_today),
    lastScan: Number.isFinite(s.last_scan) ? s.last_scan * 1000 : null,
    onHome: typeof s.on_home_network === 'boolean' ? s.on_home_network : null,
    // The dashboard only runs for sure when the login agent is installed; otherwise clicking does nothing.
    dashboard: fs.existsSync(NETWATCH_AGENT) ? 'http://127.0.0.1:8765/' : null,
  };
}

// ---------- Wi-Fi heatmap ----------

// summary.json is written by wifi-heatmap (github.com/amdpaan/wifi-heatmap) at every check-in, sample
// (every 5 s) and checkout while you log a place, so this is just a file read too.
const HEATMAP_DIR = path.join(HOME, 'Library', 'Application Support', 'wifi-heatmap');
const HEATMAP_AGENT = path.join(HOME, 'Library', 'LaunchAgents', 'com.wifiheatmap.serve.plist');
const HEATMAP_LIVE_MS = 60 * 1000; // a live reading older than this means the logging stopped uncleanly

function wifiheatmap() {
  const s = readJSON(path.join(HEATMAP_DIR, 'summary.json'));
  if (!s) return null;
  const MOODS = ['great', 'ok', 'poor', 'dead', 'idle'];
  const mood = (m) => (MOODS.includes(m) ? m : 'idle');
  const level = (v) => (Number.isInteger(v) && v >= 0 && v <= 4 ? v : 0);
  const l = s.live;
  const live = l && Number.isFinite(l.ts) && Date.now() - l.ts * 1000 < HEATMAP_LIVE_MS
    ? {
        place: String(l.place || ''),
        since: l.since * 1000,
        samples: Number.isFinite(l.samples) ? l.samples : 0,
        connected: l.connected !== false,
        rssi: Number.isFinite(l.rssi) ? l.rssi : null,
        pingMs: Number.isFinite(l.ping_ms) ? l.ping_ms : null,
        loss: Number.isFinite(l.loss) ? l.loss : null,
      }
    : null;
  return {
    // A stale live reading falls back to the mood from the rankings alone.
    mood: live ? mood(s.mood) : mood(s.base_mood || s.mood),
    level: live ? level(s.level) : level(Number.isInteger(s.base_level) ? s.base_level : s.level),
    live,
    best: s.best && s.best.name ? { name: String(s.best.name), score: s.best.score, label: String(s.best.label || '') } : null,
    dead: Array.isArray(s.dead) ? s.dead.filter((d) => d && d.name).slice(0, 3).map((d) => ({ name: String(d.name), score: d.score })) : [],
    ranked: Number.isFinite(s.ranked) ? s.ranked : 0,
    places: Number.isFinite(s.places) ? s.places : 0,
    // Like net-watch: the dashboard only runs for sure when the login agent is installed.
    dashboard: fs.existsSync(HEATMAP_AGENT) ? 'http://127.0.0.1:8766/' : null,
  };
}

// ---------- Main ----------

const timetableFile = path.join(ROOT, 'timetable.json');
const timetable = readJSON(timetableFile);

const mem = safe(memory);
process.stdout.write(
  JSON.stringify({
    now: Date.now(),
    music: safe(music),
    wrapped: safe(wrapped),
    netwatch: safe(netwatch),
    wifiheatmap: safe(wifiheatmap),
    classes: timetable
      ? safe(() => classesStatus(timetable))
      : { error: fs.existsSync(timetableFile) ? 'timetable.json is not valid JSON' : 'timetable.json not found' },
    system: { cpu: safe(cpu), mem },
    claude: { limits: safe(claudeLimits), today: safe(ccusage) },
  })
);
