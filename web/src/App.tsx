import { useEffect, useState } from "react";
import PayCallback from "./PayCallback";
import Checkout from "./Checkout";
import Storefront from "./Storefront";
import "./App.css";

function routePage(pathname: string) {
  if (pathname.startsWith("/pay/callback")) return "callback";
  if (pathname.startsWith("/checkout")) return "checkout";
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
      {page === "callback" ? (
        <PayCallback />
      ) : page === "checkout" ? (
        <Checkout />
      ) : (
        <Storefront />
      )}
    </main>
  );
}
