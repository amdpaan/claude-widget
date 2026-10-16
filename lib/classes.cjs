// Timetable logic. All times are evaluated in the timetable's timezone,
// regardless of the Mac's own timezone setting.

const TZ = 'Asia/Kuala_Lumpur';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
}

// Day index (0 = Sunday) and minutes since midnight, in TZ.
function zonedNow(now) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(now).map((p) => [p.type, p.value])
  );
  return {
    day: DAYS.indexOf(parts.weekday),
    minutes: Number(parts.hour) * 60 + Number(parts.minute) + Number(parts.second) / 60,
  };
}

function fmtTime(hhmm) {
  const mins = toMinutes(hhmm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function fmtDuration(mins) {
  mins = Math.max(0, Math.ceil(mins));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// "Makmal A1 (Network Lab)" -> "A1 (Network Lab)", "Bilik R12" -> "R12"
function shortRoom(room) {
  return String(room || '').trim().replace(/^(Makmal|Bilik|Dewan)\s+/i, '');
}

function view(c) {
  return {
    code: c.code,
    name: c.name,
    room: shortRoom(c.room),
    group: c.group || '',
    start: fmtTime(c.start),
    end: fmtTime(c.end),
  };
}

function classesStatus(timetable, now = new Date()) {
  const list = (timetable && timetable.classes) || [];
  const byDay = (d) =>
    list.filter((c) => DAYS.indexOf(c.day) === d).sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

  const { day, minutes } = zonedNow(now);
  const today = byDay(day);

  const current = today.find((c) => toMinutes(c.start) <= minutes && minutes < toMinutes(c.end));
  if (current) {
    const s = toMinutes(current.start);
    const e = toMinutes(current.end);
    return {
      mode: 'current',
      class: { ...view(current), progress: (minutes - s) / (e - s), remaining: fmtDuration(e - minutes) },
      later: today.filter((c) => toMinutes(c.start) >= e).map(view),
    };
  }

  const upcoming = today.filter((c) => toMinutes(c.start) > minutes);
  if (upcoming.length) {
    const [next, ...later] = upcoming;
    return {
      mode: 'next',
      class: { ...view(next), countdown: fmtDuration(toMinutes(next.start) - minutes) },
      later: later.map(view),
    };
  }

  for (let offset = 1; offset <= 7; offset++) {
    const d = (day + offset) % 7;
    const first = byDay(d)[0];
    if (first) {
      return { mode: 'nextDay', day: DAYS[d], class: view(first), later: [] };
    }
  }
  return { mode: 'none', later: [] };
}

module.exports = { classesStatus, fmtDuration };
