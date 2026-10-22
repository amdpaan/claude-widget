import { run, css } from 'uebersicht';

// Loaded from ~/Library/Application Support/Übersicht/widgets/claude-widget (a symlink to this repo).
const BIN = '"$HOME/Library/Application Support/Übersicht/widgets/claude-widget/bin';

export const command = `${BIN}/data.sh"`;
export const refreshFrequency = 2000;

export const initialState = { data: null, error: null };

export const updateState = (event, prev) => {
  if (event.error) return { ...prev, error: String(event.error) };
  try {
    return { data: JSON.parse(event.output), error: null };
  } catch (e) {
    return { ...prev, error: 'Bad output from data.sh' };
  }
};

// ---------- Helpers ----------

const music = (verb) => `osascript -e 'tell application "Music" to ${verb}'`;

const control = (dispatch, verb) =>
  run(music(verb))
    .then(() => run(`${command} --force`))
    .then((output) => dispatch({ output }))
    .catch(() => {});

const ok = (x) => x && !x.error;

const fmtLeft = (ms) => {
  const m = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m % 60}m`;
  return `${m}m`;
};

const fmtAgo = (ms) => {
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
};

const fmtTokens = (n) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);

const fmtGB = (b) => `${(b / 1073741824).toFixed(1)}`;

const level = (pct) => (pct >= 90 ? '#ff6b6b' : pct >= 70 ? '#ffb86b' : '#7cc4ff');

// ---------- Styles ----------

export const className = `
  top: 48px;
  right: 16px;
  width: 300px;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
  color: rgba(255, 255, 255, 0.92);
  -webkit-font-smoothing: antialiased;
`;

// No backdrop-filter: in Übersicht's WebKit the blur flickers on and off when
// the card re-renders every 2 seconds, so a plain translucent tint is used.
const card = css`
  background: rgba(24, 24, 28, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  position: relative;
`;

const section = css`
  & + & {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
  }
`;

const header = css`
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 7px;
`;

const row = css`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const between = css`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
`;

const title = css`
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const sub = css`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const small = css`
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.5);
`;

const track = css`
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
  margin: 5px 0 3px;
`;

const art = css`
  width: 44px;
  height: 44px;
  border-radius: 6px;
  flex: none;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.1);
`;

const buttons = css`
  display: flex;
  gap: 2px;
  flex: none;
`;

const btn = css`
  width: 26px;
  height: 26px;
  border-radius: 13px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
`;

const stat = css`
  flex: 1;
`;

const statValue = css`
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

const stale = css`
  opacity: 0.4;
  filter: grayscale(1);
`;

// ---------- Pieces ----------

const Icon = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d={d} />
  </svg>
);
const ICON_PREV = 'M6 5h2v14H6zM20 5v14L9 12z';
const ICON_NEXT = 'M16 5h2v14h-2zM4 5v14l11-7z';
const ICON_PLAY = 'M7 4v16l13-8z';
const ICON_PAUSE = 'M6 4h4v16H6zM14 4h4v16h-4z';

const Bar = ({ value, color = '#7cc4ff' }) => (
  <div className={track}>
    <div
      style={{
        width: `${Math.min(100, Math.max(0, value * 100))}%`,
        height: '100%',
        background: color,
        borderRadius: 2,
      }}
    />
  </div>
);

const NowPlaying = ({ m, dispatch }) => (
  <div className={section}>
    <div className={header}>Now Playing</div>
    <div className={row}>
      {m.art ? <img className={art} src={m.art} /> : <div className={art} />}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className={title}>{m.title}</div>
        <div className={sub}>{m.artist}</div>
      </div>
      <div className={buttons}>
        <button className={btn} onClick={() => control(dispatch, 'previous track')}>
          <Icon d={ICON_PREV} />
        </button>
        <button className={btn} onClick={() => control(dispatch, 'playpause')}>
          <Icon d={m.state === 'playing' ? ICON_PAUSE : ICON_PLAY} size={16} />
        </button>
        <button className={btn} onClick={() => control(dispatch, 'next track')}>
          <Icon d={ICON_NEXT} />
        </button>
      </div>
    </div>
  </div>
);

const fmtListened = (h, plays) =>
  plays > 0 && h < 0.1 ? '< 6 min' : h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)} h`;

const openReport = (file) => run(`open "${file}"`).catch(() => {});

const wrappedRow = css`
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-top: 3px;
  min-width: 0;
`;

const weekBars = css`
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 22px;
  margin-top: 6px;
`;

const DAYS = 'MTWTFSS';

// Minutes per day, Monday to Sunday; today is highlighted.
const WeekChart = ({ daily, today }) => {
  const max = Math.max(...daily, 1);
  return (
    <div>
      <div className={weekBars}>
        {daily.map((m, i) => (
          <div
            key={i}
            title={`${Math.round(m)} min`}
            style={{
              flex: 1,
              height: `${Math.max(8, (m / max) * 100)}%`,
              borderRadius: 2,
              background: i === today ? '#1ed760' : m > 0 ? 'rgba(30, 215, 96, 0.45)' : 'rgba(255, 255, 255, 0.1)',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
        {daily.map((_, i) => (
          <span
            key={i}
            className={small}
            style={{ flex: 1, textAlign: 'center', fontSize: 8.5, color: i === today ? '#1ed760' : undefined }}
          >
            {DAYS[i]}
          </span>
        ))}
      </div>
    </div>
  );
};

// This week's listening from music-wrapped's summary.json. Click to open the reports home page.
const Wrapped = ({ w }) => (
  <div
    className={section}
    style={{ cursor: w.report ? 'pointer' : 'default' }}
    title={w.report ? 'Open Music Wrapped' : ''}
    onClick={() => w.report && openReport(w.report)}
  >
    <div className={header}>This Week in Music</div>
    <div className={row} style={{ alignItems: 'stretch' }}>
      {w.art ? <img className={art} src={w.art} style={{ width: 52, height: 52 }} /> : null}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className={between}>
          <span className={statValue} style={{ fontSize: 18 }}>
            {fmtListened(w.hours, w.plays)}
            <span className={small}> listened</span>
          </span>
          <span className={small}>
            {w.plays} play{w.plays === 1 ? '' : 's'}
          </span>
        </div>
        {w.daily && <WeekChart daily={w.daily} today={w.today} />}
      </div>
    </div>
    {w.topArtist ? (
      <div style={{ marginTop: 6 }}>
        <div className={wrappedRow}>
          <span className={small} style={{ width: 62, flex: 'none' }}>Top artist</span>
          <span className={title} style={{ fontSize: 12 }}>{w.topArtist.name}</span>
        </div>
        {w.topSong && (
          <div className={wrappedRow}>
            <span className={small} style={{ width: 62, flex: 'none' }}>Top song</span>
            <span className={sub}>
              {w.topSong.title} · {w.topSong.artist}
            </span>
          </div>
        )}
        {w.topGenre && (
          <div className={wrappedRow}>
            <span className={small} style={{ width: 62, flex: 'none' }}>Top genre</span>
            <span className={sub}>{w.topGenre.name}</span>
          </div>
        )}
      </div>
    ) : (
      <div className={small} style={{ marginTop: 3 }}>Nothing logged yet this week</div>
    )}
  </div>
);

// Home Wi-Fi devices from net-watch's summary.json. Click to open the dashboard (when its agent runs).
// Styled after the net-watch dashboard: its pixel owl Pip, serif numbers and the same colour per count.
const NET_STALE_MS = 30 * 60 * 1000; // the agent scans every 5 min; older than this means it isn't running

// Pip, net-watch's own owl (16×16 pixel map, same as the dashboard). Letters are colours.
const PIP = [
  '..o..........o..', '..oo........oo..', '..obooooooooob..', '.obbbbbbbbbbbbo.',
  '.obeeeebbeeeebo.', 'obbeppebbeppebbo', 'obbeppebbeppebbo', 'obbeeeeaaeeeebbo',
  'odbbbbbaabbbbbdo', 'odbbwwwwwwwwbbdo', 'odbwwvwwvwwvwbdo', 'odbwwwwwwwwwwbdo',
  '.odwvwwvwwvwwdo.', '.odbwwwwwwwwbdo.', '..oobbbbbbbboo..', '....aa....aa....',
];
const PIP_ASLEEP = { 4: '.obbbbbbbbbbbbo.', 5: 'obbbbbbbbbbbbbbo', 6: 'obboooobboooobbo', 7: 'obbbbbbaabbbbbbo' };
const PIP_COLORS = {
  o: '#3b4278', b: '#5966a8', d: '#46528f', w: '#f3ead8', v: '#dccfb4',
  e: '#fffaf0', p: '#15172a', a: '#e0a33a', s: '#c9cff5',
};
// Little glyphs above Pip's head (x offset, rows): "z" when asleep, "!" for a new device.
const PIP_GLYPHS = {
  away: [12, ['sss', '..s', '.s.', 's..', 'sss']],
  alert: [7, ['ss', 'ss', 'ss', '..', 'ss']],
};

const Pip = ({ mood }) => {
  const rows = PIP.map((r, y) => (mood === 'away' && PIP_ASLEEP[y]) || r);
  const cells = [];
  rows.forEach((r, y) =>
    [...r].forEach((c, x) => c !== '.' && cells.push(<rect key={`${x}-${y}`} x={x} y={y + 6} width="1.02" height="1.02" fill={PIP_COLORS[c]} />))
  );
  const glyph = PIP_GLYPHS[mood];
  if (glyph) {
    const [gx, grows] = glyph;
    grows.forEach((r, y) =>
      [...r].forEach((c, x) => c !== '.' && cells.push(<rect key={`g${x}-${y}`} x={gx + x} y={y} width="1.02" height="1.02" fill={PIP_COLORS.s} />))
    );
  }
  return (
    <svg viewBox="0 0 16 22" width="30" height="41" shapeRendering="crispEdges" style={{ flex: 'none' }}>
      {cells}
    </svg>
  );
};

const NET_COLORS = { online: '#7bc28e', known: '#78a6d6', unknown: '#d9ae55' };
const serif = 'ui-serif, "New York", Georgia, serif';

const netCard = css`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 7px 9px 6px;
  border-radius: 9px;
`;

const NetWatch = ({ n, now }) => {
  const old = !n.lastScan || now - n.lastScan > NET_STALE_MS;
  const since = n.lastScan ? fmtAgo(now - n.lastScan) : null;
  const mood = n.onHome === false || old ? 'away' : n.newToday > 0 ? 'alert' : 'idle';
  const headline = !since
    ? 'Waiting for the first scan'
    : n.onHome === false
      ? 'Away from home'
      : old
        ? 'Not scanning right now'
        : n.newToday > 0
          ? `${n.newToday} new device${n.newToday === 1 ? '' : 's'} today`
          : n.unknown > 0
            ? `All quiet, ${n.unknown} unnamed`
            : 'All quiet at home';
  const status = !since ? 'No scan yet' : old || n.onHome === false ? `Counts from ${since}` : `Scanned ${since}`;
  const stats = [
    ['Online', n.online, NET_COLORS.online],
    ['Known', n.known, NET_COLORS.known],
    ['Unknown', n.unknown, NET_COLORS.unknown],
  ];
  return (
    <div
      className={section}
      style={{ cursor: n.dashboard ? 'pointer' : 'default' }}
      title={n.dashboard ? 'Open the net-watch dashboard' : ''}
      onClick={() => n.dashboard && openReport(n.dashboard)}
    >
      <div className={row} style={{ gap: 9, marginBottom: 8 }}>
        <Pip mood={mood} />
        <div style={{ minWidth: 0 }}>
          <div className={header} style={{ marginBottom: 2 }}>Home Network</div>
          <div
            className={title}
            style={{ fontFamily: serif, fontSize: 15, color: mood === 'alert' ? NET_COLORS.unknown : undefined }}
          >
            {headline}
          </div>
        </div>
      </div>
      <div className={`${row} ${old ? stale : ''}`} style={{ alignItems: 'stretch', gap: 6 }}>
        {stats.map(([label, value, color]) => (
          <div key={label} className={netCard} style={{ background: `${color}24` }}>
            <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
              {value}
            </span>
            <span className={small} style={{ color }}>{label}</span>
          </div>
        ))}
      </div>
      <div className={small} style={{ marginTop: 6 }}>{status}</div>
    </div>
  );
};

// Study spots from wifi-heatmap's summary.json. Click to open its dashboard (when its agent runs).
// While you log a place it shows the live signal; otherwise the best spot and the dead zones.

// The antenna-bot, wifi-heatmap's own pixel mascot (16×22 map and mood layers, same as its dashboard).
// Letters are colours; 1-4 are its chest bars, lit up to `level` in the mood's colour; "z" erases.
const BOT = [
  '................', '.......tt.......', '.......tt.......', '.......aa.......', '.......aa.......',
  '..oooooooooooo..', '..obbbbbbbbbbo..', '..obssssssssbo..', '..obseesseesbo..', '.dobseesseesbod.',
  '..obssssssssbo..', '..obssmmmmssbo..', '..obbbbbbbbbbo..', '..oooooooooooo..', '......oddo......',
  '...oooooooooo...', '..dobbbbbbb4od..', '..dobbbbb3b4od..', '..oobbb2b3b4oo..', '...ob1b2b3b4o...',
  '...oooooooooo...', '....ww....ww....',
];
const BOT_LAYERS = {
  happy: { 8: '..obsessssesbo..', 9: '.dobesessesebod.', 11: '..obsmmmmmmsbo..' },
  worried: { 7: '..obssssssssboq.', 8: '..obssssssssboq.' },
  sad: { 9: '.dobssssssssbod.', 10: '..obssmmmmssbo..', 11: '..obsmssssmsbo..' },
  lids: { 8: '..obssssssssbo..' },
  sparks: { 0: '....y......y....', 1: '...y........y...', 3: '..y..........y..' },
  droop: { 1: '.......zz.......', 2: '.....aaaz.......', 3: '...tt.aaz.......', 4: '...tt..aa.......' },
};
const BOT_FACES = { great: ['happy', 'sparks'], ok: [], poor: ['worried', 'lids'], dead: ['sad', 'droop'], idle: [] };
const SPOT_COLORS = { great: '#0ca30c', ok: '#fab219', poor: '#ec835a', dead: '#d03b3b', idle: '#6f797c' };
const BOT_COLORS = {
  o: '#56656c', a: '#56656c', w: '#56656c', b: '#a9bcc4', d: '#7f959f', s: '#22313a',
  e: '#7ff0c8', m: '#7ff0c8', y: '#fab219', q: '#6da7ec',
};
const BAR_OFF = '#6f858f';

const AntennaBot = ({ mood, level }) => {
  const rows = BOT.map((r, y) =>
    BOT_FACES[mood].reduce((acc, l) => {
      const lr = BOT_LAYERS[l][y];
      return lr ? [...acc].map((c, x) => (lr[x] === '.' ? c : lr[x])).join('') : acc;
    }, r)
  );
  const fill = (c) =>
    c === 't' ? (mood === 'dead' ? BAR_OFF : SPOT_COLORS[mood])
      : '1234'.includes(c) ? (Number(c) <= level ? SPOT_COLORS[mood] : BAR_OFF)
      : BOT_COLORS[c];
  return (
    <svg viewBox="0 0 16 22" width="30" height="41" shapeRendering="crispEdges" style={{ flex: 'none' }}>
      {rows.flatMap((r, y) =>
        [...r].map((c, x) => c !== '.' && c !== 'z' && <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={fill(c)} />)
      )}
    </svg>
  );
};

const WifiHeatmap = ({ h, now }) => {
  const l = h.live;
  const best = h.best;
  let headline;
  let detail;
  let status;
  if (l) {
    headline = `At ${l.place}`;
    detail = !l.samples
      ? 'Speed test running…'
      : l.connected
        ? [l.rssi != null && `${l.rssi} dBm`, l.pingMs != null && `ping ${Math.round(l.pingMs)} ms`, l.loss != null && `${Math.round(l.loss)}% loss`]
            .filter(Boolean).join(' · ')
        : 'Not connected to Wi-Fi';
    status = `Logging · ${l.samples} sample${l.samples === 1 ? '' : 's'} · since ${fmtAgo(now - l.since).replace(' ago', '')}`;
  } else if (best) {
    headline = `Best spot: ${best.name}`;
    detail = h.dead.length ? `Dead zone${h.dead.length === 1 ? '' : 's'}: ${h.dead.map((d) => d.name).join(', ')}` : 'No dead zones found';
    status = `${h.ranked} of ${h.places} place${h.places === 1 ? '' : 's'} ranked`;
  } else {
    headline = h.ranked ? 'No great spot yet' : 'No spot ranked yet';
    detail = h.ranked
      ? h.dead.length ? `Dead zone${h.dead.length === 1 ? '' : 's'}: ${h.dead.map((d) => d.name).join(', ')}` : `${h.ranked} place${h.ranked === 1 ? '' : 's'} ranked`
      : 'Log a place for a minute to rank it';
    status = h.places ? `${h.ranked} of ${h.places} place${h.places === 1 ? '' : 's'} ranked` : 'wifi-heatmap log --place "…"';
  }
  return (
    <div
      className={section}
      style={{ cursor: h.dashboard ? 'pointer' : 'default' }}
      title={h.dashboard ? 'Open the wifi-heatmap dashboard' : ''}
      onClick={() => h.dashboard && openReport(h.dashboard)}
    >
      <div className={row} style={{ gap: 9 }}>
        <AntennaBot mood={h.mood} level={h.level} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className={header} style={{ marginBottom: 2 }}>Wi-Fi Heatmap</div>
          <div className={between}>
            <span className={title} style={{ minWidth: 0 }}>{headline}</span>
            {!l && best && (
              <span className={statValue} style={{ fontSize: 13, color: SPOT_COLORS[h.mood], flex: 'none' }}>{best.score}</span>
            )}
          </div>
          <div className={sub}>{detail}</div>
          <div className={small} style={{ marginTop: 2 }}>{status}</div>
        </div>
      </div>
    </div>
  );
};

const withRoom = (c, ...rest) => [c.code, c.room, ...rest].filter(Boolean).join(' · ');

const Classes = ({ c }) => {
  if (!ok(c)) {
    return (
      <div className={section}>
        <div className={header}>Classes</div>
        <div className={small}>{c ? c.error : 'Loading…'}</div>
      </div>
    );
  }
  return (
    <div className={section}>
      <div className={header}>
        {c.mode === 'current' ? 'Class · Now' : c.mode === 'next' ? 'Class · Next' : 'Classes'}
      </div>

      {c.mode === 'current' && (
        <div>
          <div className={title}>{withRoom(c.class)}</div>
          <div className={sub}>{c.class.name}</div>
          <Bar value={c.class.progress} color="#8be59a" />
          <div className={between}>
            <span className={small}>
              {c.class.start} – {c.class.end}
            </span>
            <span className={small}>{c.class.remaining} left</span>
          </div>
        </div>
      )}

      {c.mode === 'next' && (
        <div>
          <div className={title}>{withRoom(c.class, `in ${c.class.countdown}`)}</div>
          <div className={sub}>
            {c.class.start} · {c.class.name}
          </div>
        </div>
      )}

      {c.mode === 'nextDay' && (
        <div>
          <div className={title}>
            Next: {c.day} {c.class.start}, {c.class.code}
          </div>
          <div className={sub}>{[c.class.name, c.class.room].filter(Boolean).join(' · ')}</div>
        </div>
      )}

      {c.mode === 'none' && <div className={small}>No classes in timetable.json</div>}

      {c.later.length > 0 && (
        <div style={{ marginTop: 7 }}>
          {c.later.map((l, i) => (
            <div key={i} className={small} style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <span style={{ width: 56, flex: 'none', fontVariantNumeric: 'tabular-nums' }}>{l.start}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {withRoom(l)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const System = ({ s }) => {
  const cpu = typeof s.cpu === 'number' ? s.cpu : null;
  const mem = ok(s.mem) ? s.mem : null;
  return (
    <div className={section}>
      <div className={header}>System</div>
      <div className={row} style={{ alignItems: 'flex-start', gap: 16 }}>
        <div className={stat}>
          <div className={between}>
            <span className={small}>CPU</span>
            <span className={statValue}>{cpu == null ? '–' : `${Math.round(cpu)}%`}</span>
          </div>
          <Bar value={(cpu || 0) / 100} color={level(cpu || 0)} />
        </div>
        <div className={stat}>
          <div className={between}>
            <span className={small}>RAM</span>
            <span className={statValue}>
              {mem ? fmtGB(mem.used) : '–'}
              <span className={small}> / {mem ? fmtGB(mem.total) : '–'} GB</span>
            </span>
          </div>
          <Bar value={mem ? mem.used / mem.total : 0} color={level(mem ? (100 * mem.used) / mem.total : 0)} />
        </div>
      </div>
    </div>
  );
};

const Limit = ({ label, w, now }) => {
  if (!w) {
    return (
      <div style={{ marginBottom: 6 }}>
        <div className={between}>
          <span className={small}>{label}</span>
          <span className={small}>no data</span>
        </div>
        <Bar value={0} />
      </div>
    );
  }
  const expired = w.resetsAt != null && w.resetsAt <= now;
  return (
    <div className={expired ? stale : ''} style={{ marginBottom: 6 }}>
      <div className={between}>
        <span className={small}>{label}</span>
        <span className={statValue} style={{ fontSize: 12 }}>
          {Math.round(w.percent)}%
        </span>
      </div>
      <Bar value={w.percent / 100} color={level(w.percent)} />
      <div className={small}>
        {w.resetsAt == null ? '' : expired ? 'Reset passed — waiting for new data' : `Resets in ${fmtLeft(w.resetsAt - now)}`}
      </div>
    </div>
  );
};

const Claude = ({ c, now }) => {
  const limits = ok(c.limits) ? c.limits : null;
  const today = ok(c.today) ? c.today : null;
  return (
    <div className={section}>
      <div className={header}>Claude Usage</div>
      {limits ? (
        <div>
          <Limit label="5-hour" w={limits.fiveHour} now={now} />
          <Limit label="Weekly" w={limits.sevenDay} now={now} />
        </div>
      ) : (
        <div className={small} style={{ marginBottom: 6 }}>
          No ~/.claude/usage.json yet — send a message in Claude Code.
        </div>
      )}
      <div className={between} style={{ marginTop: 4 }}>
        <span className={sub}>
          Today:{' '}
          {today && !today.loading
            ? `${fmtTokens(today.tokens)} tokens · $${today.cost.toFixed(2)}`
            : c.today && c.today.error
            ? 'ccusage error'
            : 'loading…'}
        </span>
        {limits && limits.updatedAt && <span className={small}>updated {fmtAgo(now - limits.updatedAt)}</span>}
      </div>
    </div>
  );
};

// music-wrapped's own mascot, a pixel cassette with reel eyes (16×10 map, same as its render.MASCOT),
// sitting on the card's top edge and bobbing like it does there. Click to open Music Wrapped when its reports exist.
// The `uebersicht` module has no `keyframes` export, so the animation is a plain <style>.
const CASSETTE_BOB = `
  @keyframes cassette-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
  @media (prefers-reduced-motion: reduce) { .cassette-bob { animation: none !important; } }
`;
const CASSETTE = [
  '..GGGGGGGGGGGG..', '.GLLLLLLLLLLLLG.', '.GLDDDLLLLDDDLG.', '.GLDWDLLLLDWDLG.', '.GLDDDLLLLDDDLG.',
  '.GLLLLLDDLLLLLG.', '.GGGGGGGGGGGGGG.', '.GGKGGGGGGGGKGG.', '..GGGGGGGGGGGG..', '...K.K....K.K...',
];
const CASSETTE_COLORS = { G: '#1ed760', L: '#c9f7da', D: '#0b2e19', W: '#ffffff', K: '#0b2e19' };

const mascot = css`
  position: absolute;
  top: -27px;
  right: 22px;
  width: 48px;
  height: 30px;
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.45));
  animation: cassette-bob 3.2s ease-in-out infinite;
`;

const Cassette = ({ report }) => (
  <svg
    className={`${mascot} cassette-bob`}
    viewBox="0 0 16 10"
    shapeRendering="crispEdges"
    style={{ cursor: report ? 'pointer' : 'default' }}
    onClick={() => report && openReport(report)}
  >
    <style>{CASSETTE_BOB}</style>
    {report && <title>Open Music Wrapped</title>}
    {CASSETTE.flatMap((r, y) =>
      [...r].map((c, x) => c !== '.' && <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={CASSETTE_COLORS[c]} />)
    )}
  </svg>
);

// ---------- Render ----------

export const render = ({ data, error }, dispatch) => {
  if (!data) {
    return (
      <div className={card}>
        <div className={small}>{error || 'Loading…'}</div>
      </div>
    );
  }
  const now = Date.now();
  const m = ok(data.music) ? data.music : null;
  return (
    <div className={card}>
      <Cassette report={ok(data.wrapped) && data.wrapped.report} />
      {m && <NowPlaying m={m} dispatch={dispatch} />}
      {ok(data.wrapped) && <Wrapped w={data.wrapped} />}
      <Classes c={data.classes} />
      {ok(data.netwatch) && <NetWatch n={data.netwatch} now={now} />}
      {ok(data.wifiheatmap) && <WifiHeatmap h={data.wifiheatmap} now={now} />}
      <System s={data.system} />
      <Claude c={data.claude} now={now} />
    </div>
  );
};
