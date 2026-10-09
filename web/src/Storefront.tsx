import { useStore } from "./storeContext";
import StatusPanel from "./StatusPanel";
import StoreNav from "./StoreNav";

export default function Storefront() {
  const { products, currency, storeLoading, error, addProduct, itemCount } =
    useStore();

  if (storeLoading) {
    return (
      <div className="pay-layout store-layout">
        <StatusPanel
          variant="loading"
          title="Loading store"
          message="Reading product catalog…"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pay-layout store-layout">
        <StatusPanel variant="error" {...error} />
      </div>
    );
  }

  return (
    <div className="pay-layout store-layout">
      <header className="pay-header store-header">
        <div>
          <p className="eyebrow">Open Payments Rewards</p>
          <h1>Store</h1>
          <p className="lede">
            Demo shop — prices in {currency}, pay via Open Payments.
          </p>
        </div>
        <StoreNav active="store" itemCount={itemCount} />
      </header>

      <ul className="product-list">
        {products.map((product) => (
          <li key={product.id} className="product-card">
            <div className="product-card-body">
              <h2>{product.name}</h2>
              <p className="product-desc">{product.description}</p>
              <p className="product-price">
                {product.priceMajor} <span>{currency}</span>
              </p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => addProduct(product.id)}
            >
              Add to cart
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
