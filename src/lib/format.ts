/** A number with a real minus sign (−), which is as wide as a digit, so columns stay lined up. */
export function formatNumber(value: number, digits: number): string {
  const text = Math.abs(value).toFixed(digits);
  return value < 0 && Number(text) !== 0 ? `−${text}` : text;
}

/** 0.4312 becomes "43%". */
export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}
