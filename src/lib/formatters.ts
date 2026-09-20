export function formatKpiValue(val: string | number): string {
  if (typeof val !== 'number') return val;
  if (val >= 1000000) {
    return (val / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
  }
  if (val >= 10000) {
    return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return val.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

export function formatChartAxis(val: number): string {
  if (val >= 1000000) return (val / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (val >= 1000) return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return val.toString();
}

export function formatChartTooltip(val: number, isCurrency: boolean = false, isRate: boolean = false): string {
  if (isRate) return `${(val * 100).toFixed(2)}%`;
  if (isCurrency) return `R${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return val.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

export function formatTableNumber(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '-';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return num.toLocaleString('en-US');
}

export function formatTableCurrency(val: number | string | null | undefined, prefix: string = 'R'): string {
  if (val === null || val === undefined) return '-';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return `${prefix}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
