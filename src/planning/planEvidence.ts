import type {
  PlanEvidenceHorizonRequest,
  PlanEvidencePeriod,
} from './planEvidence.types';

const ISO_DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_KEY_PATTERN =
  /^(\d{4})-(\d{2})$/;

const normalizeCurrency = (
  currency: string
) => {
  const normalized =
    currency.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error(
      'Currency must be a three-letter code'
    );
  }

  return normalized;
};

export const currencyFractionDigits = (
  currency: string
): number => {
  const normalized =
    normalizeCurrency(currency);

  try {
    return new Intl.NumberFormat(
      'en-US',
      {
        style: 'currency',
        currency: normalized,
        currencyDisplay: 'code',
      }
    ).resolvedOptions()
      .maximumFractionDigits;
  } catch {
    throw new Error(
      `Unsupported currency code: ${normalized}`
    );
  }
};

const assertFiniteMoneyValue = (
  value: number
) => {
  if (!Number.isFinite(value)) {
    throw new Error(
      'Money value must be finite'
    );
  }
};

const assertSafeMinorUnits = (
  value: number
) => {
  if (!Number.isSafeInteger(value)) {
    throw new Error(
      'Minor-unit value must be a safe integer'
    );
  }
};

const roundHalfAwayFromZero = (
  value: number
) => {
  if (value === 0) return 0;

  const sign = value < 0 ? -1 : 1;
  const absolute = Math.abs(value);
  const correction =
    Number.EPSILON *
    Math.max(1, absolute);

  return sign * Math.round(
    absolute + correction
  );
};

export const toMinorUnits = (
  value: number,
  currency: string
): number => {
  assertFiniteMoneyValue(value);

  const fractionDigits =
    currencyFractionDigits(currency);

  const factor =
    10 ** fractionDigits;

  const minorUnits =
    roundHalfAwayFromZero(
      value * factor
    );

  assertSafeMinorUnits(minorUnits);

  return minorUnits;
};

export const fromMinorUnits = (
  minorUnits: number,
  currency: string
): number => {
  assertSafeMinorUnits(minorUnits);

  const fractionDigits =
    currencyFractionDigits(currency);

  return (
    minorUnits /
    10 ** fractionDigits
  );
};

const parseIsoDate = (
  value: string,
  label: string
) => {
  const match =
    ISO_DATE_PATTERN.exec(value);

  if (!match) {
    throw new Error(
      `${label} must be a valid YYYY-MM-DD date`
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(
      `${label} must be a valid YYYY-MM-DD date`
    );
  }

  return date;
};

const parseMonthKey = (
  value: string
) => {
  const match =
    MONTH_KEY_PATTERN.exec(value);

  if (!match) {
    throw new Error(
      'Month must be a valid YYYY-MM value'
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (
    year < 1 ||
    month < 1 ||
    month > 12
  ) {
    throw new Error(
      'Month must be a valid YYYY-MM value'
    );
  }

  return {
    year,
    month,
  };
};

const toIsoDate = (
  date: Date
) =>
  date.toISOString().slice(0, 10);

const addUtcDays = (
  date: Date,
  days: number
) => {
  const result = new Date(
    date.getTime()
  );

  result.setUTCDate(
    result.getUTCDate() + days
  );

  return result;
};

const inclusiveDayCount = (
  startDate: Date,
  endDate: Date
) =>
  Math.floor(
    (
      endDate.getTime() -
      startDate.getTime()
    ) /
      86_400_000
  ) + 1;

const monthKeyForDate = (
  date: Date
) =>
  `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, '0')}`;

const startOfUtcMonth = (
  date: Date
) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      1
    )
  );

const endOfUtcMonth = (
  year: number,
  month: number
) =>
  new Date(
    Date.UTC(
      year,
      month,
      0
    )
  );

const createPeriod = (
  request: PlanEvidenceHorizonRequest,
  startDate: Date,
  endDate: Date,
  monthKey: string | null,
  isCompleteCalendarMonth: boolean
): PlanEvidencePeriod => ({
  kind: request.kind,
  startDate: toIsoDate(startDate),
  endDate: toIsoDate(endDate),
  monthKey,
  dayCount: inclusiveDayCount(
    startDate,
    endDate
  ),
  isCompleteCalendarMonth,
});

export const resolvePlanEvidencePeriod = (
  request: PlanEvidenceHorizonRequest
): PlanEvidencePeriod => {
  const anchorDate = parseIsoDate(
    request.anchorDate,
    'Anchor date'
  );

  if (request.kind === '7_days') {
    const startDate = addUtcDays(
      anchorDate,
      -6
    );

    const startMonth =
      monthKeyForDate(startDate);

    const endMonth =
      monthKeyForDate(anchorDate);

    return createPeriod(
      request,
      startDate,
      anchorDate,
      startMonth === endMonth
        ? endMonth
        : null,
      false
    );
  }

  if (request.kind === '14_days') {
    const startDate = addUtcDays(
      anchorDate,
      -13
    );

    const startMonth =
      monthKeyForDate(startDate);

    const endMonth =
      monthKeyForDate(anchorDate);

    return createPeriod(
      request,
      startDate,
      anchorDate,
      startMonth === endMonth
        ? endMonth
        : null,
      false
    );
  }

  if (
    request.kind === 'current_month'
  ) {
    return createPeriod(
      request,
      startOfUtcMonth(anchorDate),
      anchorDate,
      monthKeyForDate(anchorDate),
      false
    );
  }

  if (!request.month) {
    throw new Error(
      'Calendar-month evidence requires a month'
    );
  }

  const {
    year,
    month,
  } = parseMonthKey(request.month);

  const anchorMonth =
    monthKeyForDate(anchorDate);

  if (request.month > anchorMonth) {
    throw new Error(
      'Future calendar months are not supported'
    );
  }

  const startDate = new Date(
    Date.UTC(
      year,
      month - 1,
      1
    )
  );

  const isCurrentMonth =
    request.month === anchorMonth;

  const endDate = isCurrentMonth
    ? anchorDate
    : endOfUtcMonth(year, month);

  return createPeriod(
    request,
    startDate,
    endDate,
    request.month,
    !isCurrentMonth
  );
};
