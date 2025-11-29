import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n"; // Initialize i18n
import { initializeErrorHandling } from "./lib/errorHandler";

// Initialize global error handling
initializeErrorHandling();

createRoot(document.getElementById("root")!).render(<App />);
