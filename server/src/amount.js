/** Convert user-facing major units (e.g. 10.50) to integer minor units string. */
export function majorToMinorString(majorAmount, assetScale) {
  const major = Number(majorAmount);
  if (!Number.isFinite(major) || major <= 0) {
    throw new ValidationError("Amount must be a number greater than zero.");
  }

  const scale = Number(assetScale);
  if (!Number.isInteger(scale) || scale < 0) {
    throw new Error(`Invalid asset scale: ${assetScale}`);
  }

  const factor = 10 ** scale;
  const minor = Math.round(major * factor);
  if (minor <= 0) {
    throw new ValidationError("Amount is too small for this asset.");
  }

  return String(minor);
}

export class ValidationError extends Error {
  constructor(message, fields) {
    super(message);
    this.name = "ValidationError";
    this.fields = fields;
  }
}
