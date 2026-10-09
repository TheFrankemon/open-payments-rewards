import PayCallback from "./PayCallback";
import PayForm from "./PayForm";
import "./App.css";

export default function App() {
  const isCallback = window.location.pathname.startsWith("/pay/callback");

  return (
    <main className="app">
      {isCallback ? <PayCallback /> : <PayForm />}
    </main>
  );
}
