import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { ExperienceProvider } from "./app/ExperienceProvider";
import "./styles/globals.css";
import "./styles/stage.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ExperienceProvider>
      <App />
    </ExperienceProvider>
  </StrictMode>,
);
