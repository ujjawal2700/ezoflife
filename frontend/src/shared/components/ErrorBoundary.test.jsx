import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary, {
  parseErrorInfo,
  ErrorFallbackScreen,
} from "./ErrorBoundary";

// Mock Lucide icons for clean rendering in tests
vi.mock("lucide-react", () => ({
  AlertTriangle: () => <span data-testid="icon-alert" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
  Home: () => <span data-testid="icon-home" />,
  Copy: () => <span data-testid="icon-copy" />,
  Check: () => <span data-testid="icon-check" />,
  ChevronDown: () => <span data-testid="icon-chevron-down" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  Bug: () => <span data-testid="icon-bug" />,
  FileCode: () => <span data-testid="icon-file-code" />,
  Compass: () => <span data-testid="icon-compass" />,
  Clock: () => <span data-testid="icon-clock" />,
  Terminal: () => <span data-testid="icon-terminal" />,
}));

const CrashingComponent = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error("Test crash inside component render");
  }
  return <div>Component rendered successfully</div>;
};

describe("ErrorBoundary & ErrorFallbackScreen", () => {
  // Suppress console.error in test outputs during intentional error boundary crashes
  let originalError;
  beforeEach(() => {
    originalError = console.error;
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it("renders children normally when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Normal content")).toBeInTheDocument();
  });

  it("catches render errors and displays error message and component stack", () => {
    render(
      <ErrorBoundary>
        <CrashingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Should render the fallback screen
    expect(screen.getByText("Application Error Caught")).toBeInTheDocument();
    expect(
      screen.getByText("Test crash inside component render"),
    ).toBeInTheDocument();
    expect(screen.getByText("Reload Application")).toBeInTheDocument();
  });

  it("parses error info and extracts file path, line, and component", () => {
    const fakeError = new Error("Cannot read properties of null");
    fakeError.stack = `TypeError: Cannot read properties of null
    at VendorRoutes (http://localhost:5174/src/modules/vendor/routes/VendorRoutes.jsx?t=123:45:10)
    at renderWithHooks (http://localhost:5174/node_modules/react-dom/index.js:123:45)`;

    const fakeErrorInfo = {
      componentStack: `\n    in VendorRoutes (at App.jsx:55)\n    in Routes (at App.jsx:43)\n    in App`,
    };

    const details = parseErrorInfo(fakeError, fakeErrorInfo);

    expect(details.message).toBe("Cannot read properties of null");
    expect(details.failingComponent).toBe("VendorRoutes");
    expect(details.sourceFile).toContain("VendorRoutes.jsx");
    expect(details.lineNumber).toBe("45");
    expect(details.columnNumber).toBe("10");
  });

  it('allows clicking "Try Again" to reset the error state', () => {
    const handleReset = vi.fn();

    render(
      <ErrorFallbackScreen
        error={new Error("Recoverable test error")}
        errorInfo={{ componentStack: "\n    in TestComponent" }}
        onReset={handleReset}
      />,
    );

    expect(screen.getByText("Try Again")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Try Again"));
    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});
