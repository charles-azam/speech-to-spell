import { createRoot } from "react-dom/client";
import "./index.css";
import { GameRouter } from "./GameRouter";
import { LanguageProvider } from "./hooks/useLanguage";

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <GameRouter />
  </LanguageProvider>
);
