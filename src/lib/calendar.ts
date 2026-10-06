export type CalendarEvent = {
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
  description?: string | null;
};

/** iCalendar UTC timestamp, e.g. 20261006T140000Z. */
const stamp = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

const escapeText = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");

/** Builds and downloads an .ics file so a class, exhibition or ticket can be added to any calendar app. */
export function downloadIcs(event: CalendarEvent & { url?: string }) {
  const description = [event.description, event.url].filter(Boolean).join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ChrisEpic Arts//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${stamp(event.startsAt)}-${Math.random().toString(36).slice(2)}@chrisepicarts`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(event.endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.location ? `LOCATION:${escapeText(event.location)}` : "",
    description ? `DESCRIPTION:${escapeText(description)}` : "",
    event.url ? `URL:${event.url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${event.title.replace(/[^\w]+/g, "-").toLowerCase() || "event"}.ics`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/** Google Calendar "add event" link for the same details. */
export function googleCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(event.startsAt)}/${stamp(event.endsAt)}`,
    ...(event.location ? { location: event.location } : {}),
    ...(event.description ? { details: event.description.slice(0, 1000) } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
