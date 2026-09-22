const DECIMAL = /^\d+(?:\.\d+)?$/;

interface DecimalParts {
  coefficient: bigint;
  scale: number;
}
function decimalParts(value: string | null): DecimalParts | null {
  if (value === null || !DECIMAL.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return { coefficient: BigInt(whole + fraction), scale: fraction.length };
}

/** Exact source-value comparison without coercing warehouse decimals to Number. */
export function compareExactDecimals(left: string | null, right: string | null): number {
  const a = decimalParts(left), b = decimalParts(right);
  if (!a || !b) return a ? 1 : b ? -1 : 0;
  const scale = Math.max(a.scale, b.scale);
  const av = a.coefficient * 10n ** BigInt(scale - a.scale);
  const bv = b.coefficient * 10n ** BigInt(scale - b.scale);
  return av === bv ? 0 : av > bv ? 1 : -1;
}

/** Exact percentage, rounded half-up once. Null means the ratio is not supportable. */
export function exactRatioPercent(numerator: string | null, denominator: string | null, places = 2): string | null {
  const n = decimalParts(numerator), d = decimalParts(denominator);
  if (!n || !d || d.coefficient === 0n || places < 0 || places > 6) return null;
  const precision = 10n ** BigInt(places);
  const scaledNumerator = n.coefficient * 10n ** BigInt(d.scale) * 100n * precision;
  const scaledDenominator = d.coefficient * 10n ** BigInt(n.scale);
  const rounded = (scaledNumerator * 2n + scaledDenominator) / (2n * scaledDenominator);
  if (places === 0) return rounded.toString();
  const digits = rounded.toString().padStart(places + 1, '0');
  return `${digits.slice(0, -places)}.${digits.slice(-places)}`;
}
