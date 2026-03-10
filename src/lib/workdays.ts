// Calculate Easter Sunday using the Anonymous Gregorian algorithm
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function dateToString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Dutch national holidays for a given year
export function getDutchHolidays(year: number): string[] {
  const easter = getEasterDate(year);

  // Koningsdag: 27 april, or 26 april if 27 is Sunday
  const koningsdag = new Date(year, 3, 27);
  if (koningsdag.getDay() === 0) koningsdag.setDate(26);

  const holidays = [
    new Date(year, 0, 1),          // Nieuwjaarsdag
    addDays(easter, -2),           // Goede Vrijdag
    easter,                        // Eerste Paasdag
    addDays(easter, 1),            // Tweede Paasdag
    koningsdag,                    // Koningsdag
    new Date(year, 4, 5),          // Bevrijdingsdag
    addDays(easter, 39),           // Hemelvaartsdag
    addDays(easter, 49),           // Eerste Pinksterdag
    addDays(easter, 50),           // Tweede Pinksterdag
    new Date(year, 11, 25),        // Eerste Kerstdag
    new Date(year, 11, 26),        // Tweede Kerstdag
  ];

  return holidays.map(dateToString);
}

// Get all weekdays (ma-vr) in a given month
export function getWeekdaysInMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let weekdays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month - 1, day).getDay();
    if (dow >= 1 && dow <= 5) weekdays++;
  }
  return weekdays;
}

// Get holidays that fall on weekdays in a given month
export function getHolidayWeekdaysInMonth(year: number, month: number): string[] {
  const holidays = getDutchHolidays(year);
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  return holidays.filter(h => {
    if (!h.startsWith(monthStr)) return false;
    const date = new Date(h);
    const dow = date.getDay();
    return dow >= 1 && dow <= 5;
  });
}

// Calculate available workdays in a month
// = weekdays - holidays on weekdays - personal days off on weekdays
export function getAvailableWorkdays(
  year: number,
  month: number,
  daysOff: string[] = []
): number {
  const totalWeekdays = getWeekdaysInMonth(year, month);
  const holidayWeekdays = getHolidayWeekdaysInMonth(year, month);

  // Filter days off that are weekdays and not already holidays
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const uniqueDaysOff = daysOff.filter(d => {
    if (!d.startsWith(monthStr)) return false;
    const date = new Date(d);
    const dow = date.getDay();
    if (dow < 1 || dow > 5) return false;
    return !holidayWeekdays.includes(d);
  });

  return totalWeekdays - holidayWeekdays.length - uniqueDaysOff.length;
}

// Calculate monthly budget from weekly hours
// Formula: weekbudget ÷ 5 × available workdays
export function calculateMonthlyBudget(
  weeklyHours: number,
  year: number,
  month: number,
  daysOff: string[] = []
): number {
  const availableWorkdays = getAvailableWorkdays(year, month, daysOff);
  return (weeklyHours / 5) * availableWorkdays;
}

// Get Dutch holiday name
export function getDutchHolidayName(dateStr: string): string | null {
  const year = parseInt(dateStr.substring(0, 4));
  const easter = getEasterDate(year);

  const koningsdag = new Date(year, 3, 27);
  if (koningsdag.getDay() === 0) koningsdag.setDate(26);

  const holidayNames: Record<string, string> = {
    [dateToString(new Date(year, 0, 1))]: 'Nieuwjaarsdag',
    [dateToString(addDays(easter, -2))]: 'Goede Vrijdag',
    [dateToString(easter)]: 'Eerste Paasdag',
    [dateToString(addDays(easter, 1))]: 'Tweede Paasdag',
    [dateToString(koningsdag)]: 'Koningsdag',
    [dateToString(new Date(year, 4, 5))]: 'Bevrijdingsdag',
    [dateToString(addDays(easter, 39))]: 'Hemelvaartsdag',
    [dateToString(addDays(easter, 49))]: 'Eerste Pinksterdag',
    [dateToString(addDays(easter, 50))]: 'Tweede Pinksterdag',
    [dateToString(new Date(year, 11, 25))]: 'Eerste Kerstdag',
    [dateToString(new Date(year, 11, 26))]: 'Tweede Kerstdag',
  };

  return holidayNames[dateStr] || null;
}
