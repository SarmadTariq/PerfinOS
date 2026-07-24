export interface MonthlyReportPeriod {
  month: string;
  startDate: string;
  endDate: string;
  label: string;
  daysInPeriod: number;
}

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (value: number) => String(value).padStart(2, '0');

export const isIsoDate = (value: string) => {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

/** Safely parses a YYYY-MM key into its inclusive local-date boundaries. */
export const parseMonthlyReportPeriod = (month: string): MonthlyReportPeriod | null => {
  const match = MONTH_KEY.exec(month);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const label = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, monthIndex, 1))
  );

  return {
    month,
    startDate: `${year}-${pad(monthIndex + 1)}-01`,
    endDate: `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}`,
    label,
    daysInPeriod: lastDay,
  };
};

export const requireMonthlyReportPeriod = (month: string) => {
  const period = parseMonthlyReportPeriod(month);
  if (!period) throw new Error('Report month must use YYYY-MM with a valid month');
  return period;
};

export const isDateInMonthlyReportPeriod = (date: string, period: MonthlyReportPeriod) =>
  isIsoDate(date) && date >= period.startDate && date <= period.endDate;
