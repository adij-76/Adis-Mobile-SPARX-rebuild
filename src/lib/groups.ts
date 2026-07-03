/**
 * Scheduling helpers for the weekly coaching groups (production `sds_groups`).
 *
 * A group recurs weekly on `meetDay` at `meetTimeChar` ("9:00 AM"), anchored to
 * a source time zone (America/Los_Angeles). These helpers compute the next
 * occurrence as an absolute instant and format it in the viewer's own zone, so
 * a member in New York sees "Mon, 12:00 PM EST" for a 9 AM Pacific group.
 *
 * Pure Intl (no date library): tz offsets come from Intl.DateTimeFormat, which
 * both web and Hermes support.
 */

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/** The device's IANA time zone, used when the user has none set. */
export function deviceTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';
  } catch {
    return 'America/Los_Angeles';
  }
}

/** "9:00 AM" / "12:00 PM" → { hour, minute } in 24h, or null if unparseable. */
export function parseMeetTime(meetTimeChar: string | null): { hour: number; minute: number } | null {
  const m = meetTimeChar?.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return { hour: h, minute: min };
}

/** "60 Min" / "60 mins " → 60 (defaults to 60). */
export function parseMeetLengthMin(meetLengthChar: string | null): number {
  const m = meetLengthChar?.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 60;
}

/** Weekday index from `meetDay`, falling back to a weekday word in the title. */
export function weekdayIndex(meetDay: string | null, title?: string): number | null {
  const d = meetDay?.trim().toLowerCase();
  if (d && d in DAY_INDEX) return DAY_INDEX[d];
  const t = (title ?? '').toLowerCase();
  for (const [name, idx] of Object.entries(DAY_INDEX)) if (t.includes(name)) return idx;
  return null;
}

/** Offset (ms) such that `utc + offset` reads as wall-clock in `tz` at `date`. */
function tzOffset(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUTC - date.getTime();
}

/** Interpret a wall-clock time in `tz` and return the absolute UTC instant. */
function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string): Date {
  const guess = Date.UTC(y, mo, d, h, mi);
  // Two passes converge across DST boundaries.
  const off1 = tzOffset(new Date(guess), tz);
  const off2 = tzOffset(new Date(guess - off1), tz);
  return new Date(guess - off2);
}

/** The calendar date + weekday of `date` as seen in `tz`. */
function ymdInTz(date: Date, tz: string): { y: number; mo: number; d: number; weekday: number } {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  const wd: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { y: +p.year, mo: +p.month - 1, d: +p.day, weekday: wd[p.weekday] ?? 0 };
}

/**
 * Next occurrence (absolute instant) of a weekly group, at or after `now` minus
 * its length (so an in-progress meeting still counts as "next"). Null when the
 * day/time can't be parsed.
 */
export function nextOccurrence(opts: {
  meetDay: string | null;
  title?: string;
  meetTimeChar: string | null;
  lengthMin: number;
  sourceTz: string;
  now?: Date;
}): Date | null {
  const now = opts.now ?? new Date();
  const wd = weekdayIndex(opts.meetDay, opts.title);
  const t = parseMeetTime(opts.meetTimeChar);
  if (wd == null || !t) return null;
  const src = ymdInTz(now, opts.sourceTz);
  for (let add = 0; add <= 7; add++) {
    if ((src.weekday + add) % 7 !== wd) continue;
    const base = new Date(Date.UTC(src.y, src.mo, src.d));
    base.setUTCDate(base.getUTCDate() + add);
    const inst = zonedToUtc(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), t.hour, t.minute, opts.sourceTz);
    if (inst.getTime() + opts.lengthMin * 60000 >= now.getTime()) return inst;
  }
  return null;
}

/** Format an instant in `tz` → e.g. { day: "Mon, Jun 22", time: "12:00 PM EST" }. */
export function formatOccurrence(inst: Date, tz: string): { day: string; time: string; full: string } {
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(inst);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(inst);
  return { day, time, full: `${day} · ${time}` };
}

/** A friendly countdown ("in 3 days", "in 2 hours", "starting now"). */
export function untilLabel(inst: Date, now = new Date()): string {
  const ms = inst.getTime() - now.getTime();
  if (ms <= 0) return 'happening now';
  const min = Math.round(ms / 60000);
  if (min < 60) return `in ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `in ${hr} hour${hr === 1 ? '' : 's'}`;
  const days = Math.round(hr / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

/**
 * Whether the Zoom join link should be live: from `revealMinBefore` minutes
 * before the start through the end of the meeting. Members see the link "the
 * day of / an hour before", not earlier.
 */
export function joinOpen(inst: Date, lengthMin: number, revealMinBefore = 60, now = new Date()): boolean {
  const start = inst.getTime();
  return now.getTime() >= start - revealMinBefore * 60000 && now.getTime() <= start + lengthMin * 60000;
}
