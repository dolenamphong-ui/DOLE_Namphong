const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

export function toBuddhistYear(gregorianYear: number): number {
  return gregorianYear < 2400 ? gregorianYear + 543 : gregorianYear;
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentThaiYear(): string {
  const now = new Date();
  return String(toBuddhistYear(now.getFullYear()));
}

export function parseISODateParts(isoDateStr: string): { day: number; monthIndex: number; yearBE: number; yearCE: number } | null {
  if (!isoDateStr) return null;
  const clean = isoDateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    let year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 0 && month < 12) {
      const yearCE = year > 2400 ? year - 543 : year;
      const yearBE = toBuddhistYear(yearCE);
      return { day, monthIndex: month, yearBE, yearCE };
    }
  }
  const d = new Date(isoDateStr);
  if (isNaN(d.getTime())) return null;
  const yearCE = d.getFullYear() > 2400 ? d.getFullYear() - 543 : d.getFullYear();
  return {
    day: d.getDate(),
    monthIndex: d.getMonth(),
    yearBE: toBuddhistYear(yearCE),
    yearCE,
  };
}

export function formatThaiDate(isoDateStr?: string): string {
  if (!isoDateStr) return '-';
  const parts = parseISODateParts(isoDateStr);
  if (!parts) return isoDateStr;
  return `${parts.day} ${THAI_MONTHS_FULL[parts.monthIndex]} ${parts.yearBE}`;
}

export function formatThaiDateShort(isoDateStr?: string): string {
  if (!isoDateStr) return '-';
  const parts = parseISODateParts(isoDateStr);
  if (!parts) return isoDateStr;
  return `${parts.day} ${THAI_MONTHS_SHORT[parts.monthIndex]} ${parts.yearBE}`;
}

export function formatThaiDateTime(isoDateTimeStr?: string): string {
  if (!isoDateTimeStr) return '-';
  const d = new Date(isoDateTimeStr);
  if (isNaN(d.getTime())) return formatThaiDate(isoDateTimeStr);
  const day = d.getDate();
  const month = THAI_MONTHS_SHORT[d.getMonth()];
  const yearBE = toBuddhistYear(d.getFullYear());
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${yearBE} เวลา ${hh}:${mm} น.`;
}

export function getThaiMonthName(monthIndex: number): string {
  return THAI_MONTHS_FULL[monthIndex] || '';
}

export function calculateLeaveDays(
  startDateISO: string,
  endDateISO: string,
  durationType: string,
  excludeWeekends = false
): number {
  if (!startDateISO || !endDateISO) return 0;
  if (durationType.includes('ครึ่งวัน')) {
    return 0.5;
  }
  const startParts = parseISODateParts(startDateISO);
  const endParts = parseISODateParts(endDateISO);
  if (!startParts || !endParts) return 0;

  const start = new Date(startParts.yearCE, startParts.monthIndex, startParts.day);
  const end = new Date(endParts.yearCE, endParts.monthIndex, endParts.day);

  if (end < start) return -1;

  if (!excludeWeekends) {
    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dayOfWeek = cur.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function toThaiNumerals(input: string | number): string {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return String(input).replace(/[0-9]/g, (d) => thaiDigits[parseInt(d, 10)]);
}
