import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getCatalogPath } from "./config.js";

function validateProduct(raw, index) {
  const prefix = `products[${index}]`;
  if (!raw || typeof raw !== "object") {
    throw new Error(`${prefix}: must be an object.`);
  }
  const { id, name, description, priceMajor } = raw;
  if (typeof id !== "string" || !id.trim()) {
    throw new Error(`${prefix}: "id" must be a non-empty string.`);
  }
  if (typeof name !== "string" || !name.trim()) {
    throw new Error(`${prefix}: "name" must be a non-empty string.`);
  }
  if (typeof description !== "string") {
    throw new Error(`${prefix}: "description" must be a string.`);
  }
  if (typeof priceMajor !== "string" && typeof priceMajor !== "number") {
    throw new Error(`${prefix}: "priceMajor" must be a number or string.`);
  }
  const price = Number(priceMajor);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`${prefix}: "priceMajor" must be greater than zero.`);
  }
  return {
    id: id.trim(),
    name: name.trim(),
    description: description.trim(),
    priceMajor: price.toFixed(2),
  };
}

export function loadCatalog() {
  const absolutePath = getCatalogPath();
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(absolutePath, "utf8"));
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      throw new Error(`Catalog file not found: ${absolutePath}`);
    }
    throw new Error(
      `Invalid catalog JSON (${absolutePath}): ${err instanceof Error ? err.message : "parse error"}`,
    );
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.products)) {
    throw new Error('Catalog must be a JSON object with a "products" array.');
  }

  const currency =
    typeof parsed.currency === "string" && parsed.currency.trim()
      ? parsed.currency.trim()
      : "SGD";

  const products = parsed.products.map(validateProduct);
  const ids = new Set();
  for (const product of products) {
    if (ids.has(product.id)) {
      throw new Error(`Duplicate product id "${product.id}" in catalog.`);
    }
    ids.add(product.id);
  }

  return { currency, products };
}
