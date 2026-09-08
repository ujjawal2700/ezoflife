import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary, {
  ErrorFallbackScreen,
} from "./shared/components/ErrorBoundary.jsx";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

let isAppMounted = false;

// Global Error Handler for Mobile Debugging & pre-mount fatal errors
window.onerror = (msg, url, line, col, error) => {
  console.error("🚀 App Error:", { msg, url, line, col, error });

  // If React has not mounted or the DOM root is empty, render the ErrorFallbackScreen
  if (
    !isAppMounted ||
    !rootElement.hasChildNodes() ||
    rootElement.innerHTML.trim() === ""
  ) {
    const err =
      error ||
      new Error(
        typeof msg === "string" ? msg : "An unhandled script error occurred",
      );
    if (!err.stack && url) {
      err.stack = `Error: ${msg}\n    at ${url}:${line || 0}:${col || 0}`;
    }
    root.render(
      <ErrorFallbackScreen
        error={err}
        onReset={() => window.location.reload()}
      />,
    );
  }
  return false;
};

// Handle unhandled promise rejections that might leave the screen blank
window.addEventListener("unhandledrejection", (event) => {
  console.error("🚀 Unhandled Rejection:", event.reason);
  if (
    !isAppMounted ||
    !rootElement.hasChildNodes() ||
    rootElement.innerHTML.trim() === ""
  ) {
    const reason = event.reason;
    const err =
      reason instanceof Error
        ? reason
        : new Error(String(reason || "Unhandled promise rejection"));
    root.render(
      <ErrorFallbackScreen
        error={err}
        onReset={() => window.location.reload()}
      />,
    );
  }
});

// Prevent double tap zoom on iOS
if (typeof document !== "undefined") {
  document.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );
}

root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

isAppMounted = true;
