const INDIA_TIME_ZONE = "Asia/Kolkata";

export function getIndiaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

export function getBusinessDate(date = new Date()): Date {
  const { year, month, day } = getIndiaDateParts(date);
  return new Date(Date.UTC(year, month - 1, day));
}

export function parseIsoBusinessDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Invalid ISO business date");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("Invalid ISO business date");
  }
  return date;
}

export function getBusinessDateRange(date = new Date()): { start: Date; end: Date } {
  const start = getBusinessDate(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function monthDateRange(month: string): { start: Date; end: Date } {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error("Invalid month");
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return { start, end };
}

export function formatDisplaySerial(businessDate: Date | string, serialNumber: number): string {
  const value = new Date(businessDate);
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  const d = String(value.getUTCDate()).padStart(2, "0");
  return `IN-${y}${m}${d}-${String(serialNumber).padStart(4, "0")}`;
}
