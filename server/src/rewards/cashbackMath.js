/** 2% cashback in minor units: floor(paidMinor * rateBps / 10_000). */
export function computeCashbackMinor(debitValue, rateBps = 200) {
  const paid = BigInt(String(debitValue));
  const bps = BigInt(rateBps);
  const cashback = (paid * bps) / 10_000n;
  return cashback > 0n ? String(cashback) : "0";
}

export function minorToMajorString(minorStr, assetScale) {
  const minor = BigInt(minorStr);
  const scale = Number(assetScale);
  if (scale <= 0) return String(minor);
  const factor = 10n ** BigInt(scale);
  const whole = minor / factor;
  const frac = minor % factor;
  return `${whole}.${frac.toString().padStart(scale, "0")}`;
}
