import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { ExperienceProvider } from "./app/ExperienceProvider";
import "./styles/globals.css";
import "./styles/stage.css";

// The back office lives at ?admin (or #admin). It is loaded separately so the exhibition never ships the tokenizer.
// eslint-disable-next-line react-refresh/only-export-components
const AdminApp = lazy(() => import("./admin/AdminApp"));
const isAdmin = new URLSearchParams(window.location.search).has("admin") || window.location.hash === "#admin";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={<p style={{ padding: 24 }}>後台載入中……</p>}>
        <AdminApp />
      </Suspense>
    ) : (
      <ExperienceProvider>
        <App />
      </ExperienceProvider>
    )}
  </StrictMode>,
);
