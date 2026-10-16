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

// This week's listening from music-wrapped's summary.json. Click to open the weekly report.
const Wrapped = ({ w }) => (
  <div
    className={section}
    style={{ cursor: w.report ? 'pointer' : 'default' }}
    title={w.report ? 'Open the weekly report' : ''}
    onClick={() => w.report && openReport(w.report)}
  >
    <div className={header}>This Week in Music</div>
    <div className={between}>
      <span className={statValue}>
        {fmtListened(w.hours, w.plays)}
        <span className={small}> listened</span>
      </span>
      <span className={small}>
        {w.plays} play{w.plays === 1 ? '' : 's'}
      </span>
    </div>
    {w.topArtist ? (
      <div>
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
      </div>
    ) : (
      <div className={small} style={{ marginTop: 3 }}>Nothing logged yet this week</div>
    )}
  </div>
);

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
      {m && <NowPlaying m={m} dispatch={dispatch} />}
      {ok(data.wrapped) && <Wrapped w={data.wrapped} />}
      <Classes c={data.classes} />
      <System s={data.system} />
      <Claude c={data.claude} now={now} />
    </div>
  );
};
