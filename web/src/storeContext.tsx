import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { parseApiError } from "./paymentUi";

export type Product = {
  id: string;
  name: string;
  description: string;
  priceMajor: string;
};

type StorePayload = {
  currency: string;
  products: Product[];
  receiverWalletUrl?: string;
};

type CartLine = { product: Product; quantity: number };

type StoreContextValue = {
  storeLoading: boolean;
  error: ReturnType<typeof parseApiError> | null;
  currency: string;
  products: Product[];
  receiverWalletUrl: string | null;
  lines: CartLine[];
  itemCount: number;
  totalMajor: string;
  addProduct: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartSyncing: boolean;
};

const StoreContext = createContext<StoreContextValue | null>(null);

const CART_STORAGE_KEY = "open-payments-rewards-cart";

function readStoredQuantities(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, number> = {};
    for (const [id, qty] of Object.entries(parsed)) {
      const n = Number(qty);
      if (typeof id === "string" && Number.isFinite(n) && n > 0) out[id] = n;
    }
    return out;
  } catch {
    return {};
  }
}

function writeStoredQuantities(quantities: Record<string, number>) {
  try {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(quantities));
  } catch {
    /* private mode / quota — in-memory cart still works for SPA nav */
  }
}

function sumQuantities(quantities: Record<string, number>) {
  return Object.values(quantities).reduce(
    (n, q) => n + (Number.isFinite(q) && q > 0 ? q : 0),
    0,
  );
}

function cartTotalMajor(lines: CartLine[]) {
  const sum = lines.reduce(
    (n, line) => n + Number(line.product.priceMajor) * line.quantity,
    0,
  );
  return sum.toFixed(2);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<StorePayload | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [error, setError] = useState<ReturnType<typeof parseApiError> | null>(
    null,
  );
  const [quantities, setQuantities] = useState(() => readStoredQuantities());

  useEffect(() => {
    fetch("/api/store")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          setError(parseApiError(body, "Could not load store."));
          return;
        }
        setPayload(body as StorePayload);
      })
      .catch(() => {
        setError({
          title: "Cannot reach API",
          message: "Run npm run dev from the repo root.",
        });
      })
      .finally(() => setStoreLoading(false));
  }, []);

  const products = payload?.products ?? [];
  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const lines = useMemo(
    () =>
      Object.entries(quantities).flatMap(([productId, quantity]) => {
        if (quantity <= 0) return [];
        const product = productById.get(productId);
        return product ? [{ product, quantity }] : [];
      }),
    [quantities, productById],
  );

  const storedItemCount = sumQuantities(quantities);

  const value = useMemo((): StoreContextValue => {
    const cartSyncing =
      storeLoading && storedItemCount > 0 && lines.length === 0;
    return {
      storeLoading,
      error,
      currency: payload?.currency ?? "SGD",
      products,
      receiverWalletUrl: payload?.receiverWalletUrl?.trim() || null,
      lines,
      itemCount: storedItemCount,
      cartSyncing,
      totalMajor: cartTotalMajor(lines),
      addProduct(productId) {
        setQuantities((prev) => {
          const next = {
            ...prev,
            [productId]: (prev[productId] ?? 0) + 1,
          };
          writeStoredQuantities(next);
          return next;
        });
      },
      setQuantity(productId, quantity) {
        setQuantities((prev) => {
          const next = { ...prev };
          if (quantity <= 0) delete next[productId];
          else next[productId] = quantity;
          writeStoredQuantities(next);
          return next;
        });
      },
      clearCart() {
        setQuantities({});
        writeStoredQuantities({});
      },
    };
  }, [
    storeLoading,
    error,
    payload,
    products,
    lines,
    storedItemCount,
  ]);

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
