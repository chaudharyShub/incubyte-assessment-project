/**
 * Formats a decimal string as money, e.g. "₹1,06,500" or "$4,200.50".
 * Rupees use Indian digit grouping; decimals are shown only when there are any.
 */
export function formatMoney(amount: string, currencyCode: string): string {
  const value = Number(amount);
  const fractionDigits = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat(currencyCode === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Formats 'YYYY-MM-DD' as "22 Nov 2024", without shifting the day across timezones. */
export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

/** Today's date as 'YYYY-MM-DD' in the user's own timezone. */
export function todayIsoDate(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
