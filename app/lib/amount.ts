export function formatAtomic(value: string, decimals = 0): string {
  if (
    !/^-?\d+$/.test(value) ||
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 78
  )
    return "—";
  const negative = value.startsWith("-");
  const digits = value
    .replace(/^-/, "")
    .replace(/^0+(?=\d)/, "")
    .padStart(decimals + 1, "0");
  const whole = decimals ? digits.slice(0, -decimals) : digits;
  const fraction = decimals ? digits.slice(-decimals).replace(/0+$/, "") : "";
  return `${negative && /[1-9]/.test(digits) ? "-" : ""}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction ? `.${fraction}` : ""}`;
}
export function safeReturnPath(value: string | null): string {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\x00-\x1f]/.test(value)
    ? value
    : "/dashboard";
}
