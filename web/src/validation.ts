export type PayFormValues = {
  amount: string;
  receiverWalletUrl: string;
};

export type PayFormErrors = Partial<Record<keyof PayFormValues, string>>;

export function validatePayForm(values: PayFormValues): PayFormErrors {
  const errors: PayFormErrors = {};

  const amountTrimmed = values.amount.trim();
  if (!amountTrimmed) {
    errors.amount = "Enter an amount.";
  } else {
    const amount = Number(amountTrimmed);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.amount = "Amount must be a number greater than zero.";
    }
  }

  const receiver = values.receiverWalletUrl.trim();
  if (!receiver) {
    errors.receiverWalletUrl = "Enter a receiver wallet URL.";
  } else {
    let parsed: URL;
    try {
      parsed = new URL(receiver);
    } catch {
      errors.receiverWalletUrl = "Use a valid URL (https://…).";
      return errors;
    }
    if (parsed.protocol !== "https:") {
      errors.receiverWalletUrl = "Wallet URL must start with https:// (not $).";
    }
    if (parsed.pathname.endsWith("/")) {
      errors.receiverWalletUrl = "Remove the trailing slash from the URL.";
    }
  }

  return errors;
}

export function isValidPayForm(errors: PayFormErrors): boolean {
  return Object.keys(errors).length === 0;
}
