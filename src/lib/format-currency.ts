export function formatCurrencyAmount(value: unknown): string {
  const amount = Number(value);
  return (Number.isFinite(amount) ? amount : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
