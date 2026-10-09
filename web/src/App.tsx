import { useEffect, useState } from "react";
import PayCallback from "./PayCallback";
import Checkout from "./Checkout";
import Rewards from "./Rewards";
import Storefront from "./Storefront";
import "./App.css";

function routePage(pathname: string) {
  if (pathname.startsWith("/pay/rewards-grant-setup")) return "rewards-grant-setup";
  if (pathname.startsWith("/pay/rewards-callback")) return "rewards-callback";
  if (pathname.startsWith("/pay/callback")) return "callback";
  if (pathname.startsWith("/checkout")) return "checkout";
  if (pathname.startsWith("/rewards")) return "rewards";
  return "store";
}

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const page = routePage(pathname);

  return (
    <main className="app">
      {page === "rewards-grant-setup" ||
      page === "rewards-callback" ||
      page === "callback" ? (
        <PayCallback />
      ) : page === "checkout" ? (
        <Checkout />
      ) : page === "rewards" ? (
        <Rewards />
      ) : (
        <Storefront />
      )}
    </main>
  );
}
