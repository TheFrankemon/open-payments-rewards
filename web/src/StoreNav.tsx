import { onSpaLinkClick } from "./nav";

type Props = {
  active: "store" | "rewards";
  itemCount?: number;
};

export default function StoreNav({ active, itemCount = 0 }: Props) {
  return (
    <nav className="store-nav">
      {active !== "store" ? (
        <a className="cart-link" href="/" onClick={onSpaLinkClick}>
          Store
        </a>
      ) : null}
      <a
        className={`cart-link${active === "rewards" ? " cart-link-active" : ""}`}
        href="/rewards"
        onClick={onSpaLinkClick}
      >
        Rewards
      </a>
      {active !== "rewards" ? (
        <a
          className={`cart-link${active === "store" && itemCount > 0 ? " cart-link-active" : ""}`}
          href="/checkout"
          onClick={onSpaLinkClick}
        >
          Checkout{itemCount > 0 ? ` (${itemCount})` : ""}
        </a>
      ) : null}
    </nav>
  );
}
