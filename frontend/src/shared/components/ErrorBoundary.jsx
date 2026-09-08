import React, { Component } from "react";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Bug,
  FileCode,
  Compass,
  Clock,
  Terminal,
} from "lucide-react";

/**
 * Extracts human-readable location details (file, line, column, component)
 * from standard JS Error stacks and React componentStacks.
 */
export function parseErrorInfo(error, errorInfo) {
  const result = {
    message:
      error?.message ||
      (typeof error === "string" ? error : "An unexpected error occurred"),
    name: error?.name || "Error",
    sourceFile: null,
    lineNumber: null,
    columnNumber: null,
    failingComponent: null,
    componentHierarchy: [],
    rawStack: error?.stack || "",
    componentStack: errorInfo?.componentStack || "",
  };

  // 1. Parse component stack if available
  if (result.componentStack) {
    const lines = result.componentStack
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    lines.forEach((line) => {
      // Matches "in ComponentName (at file.jsx:123)" or "at ComponentName (file.jsx:123)"
      const compMatch = line.match(
        /(?:in|at)\s+([A-Za-z0-9_$]+)(?:\s+\(?(?:at\s+)?([^):]+):?(\d+)?:?(\d+)?\)?)?/,
      );
      if (compMatch) {
        const [, name, file, lineNum, colNum] = compMatch;
        result.componentHierarchy.push({
          component: name,
          file: file ? cleanFilePath(file) : null,
          line: lineNum || null,
          col: colNum || null,
        });
      }
    });

    if (result.componentHierarchy.length > 0) {
      result.failingComponent = result.componentHierarchy[0].component;
      if (result.componentHierarchy[0].file) {
        result.sourceFile = result.componentHierarchy[0].file;
        result.lineNumber = result.componentHierarchy[0].line;
        result.columnNumber = result.componentHierarchy[0].col;
      }
    }
  }

  // 2. Parse JS error stack if sourceFile not determined yet or to get precise code location
  if (result.rawStack) {
    const stackLines = result.rawStack.split("\n");

    // Look first for project source files (containing /src/)
    for (const line of stackLines) {
      // Matches "at FunctionName (http://localhost:.../src/path/file.jsx:45:10)" or "FunctionName@http://..."
      const match = line.match(
        /(?:at\s+(?:([^\s(]+)\s+\()?)?(https?:\/\/[^\s)]+|\/[^\s)]+|[A-Za-z]:\\[^\s)]+):(\d+):(\d+)\)?/,
      );
      if (match) {
        const [, fnName, fullUrl, lineNum, colNum] = match;
        const cleaned = cleanFilePath(fullUrl);

        // Prioritize source files inside src/
        if (cleaned.includes("/src/") || cleaned.startsWith("src/")) {
          result.sourceFile = cleaned;
          result.lineNumber = lineNum;
          result.columnNumber = colNum;
          if (!result.failingComponent && fnName && !fnName.includes(".")) {
            result.failingComponent = fnName;
          }
          break;
        }

        // Fallback to first non-internal frame if no src/ match found yet
        if (
          !result.sourceFile &&
          !cleaned.includes("node_modules") &&
          !cleaned.includes("@vite")
        ) {
          result.sourceFile = cleaned;
          result.lineNumber = lineNum;
          result.columnNumber = colNum;
        }
      }
    }
  }

  return result;
}

/**
 * Strips URL origins, query parameters (e.g. ?t=12345 Vite query hashes),
 * and isolates the relevant repository-relative path.
 */
function cleanFilePath(rawPath) {
  if (!rawPath) return "";
  try {
    let path = rawPath;
    // Remove query params and hashes (e.g. ?t=123 or ?import)
    path = path.split("?")[0].split("#")[0];

    // If it's a full URL (http://localhost:5174/src/...)
    if (path.startsWith("http://") || path.startsWith("https://")) {
      const url = new URL(path);
      path = url.pathname;
    }

    // Trim leading slashes
    if (path.startsWith("/")) {
      path = path.substring(1);
    }

    return path;
  } catch {
    return rawPath;
  }
}

/**
 * Default visual Error Screen presenting the error message,
 * extracted code location, component hierarchy, and recovery actions.
 */
export function ErrorFallbackScreen({ error, errorInfo, onReset }) {
  const [copied, setCopied] = React.useState(false);
  const [showComponentStack, setShowComponentStack] = React.useState(true);
  const [showCallStack, setShowCallStack] = React.useState(false);

  const details = React.useMemo(
    () => parseErrorInfo(error, errorInfo),
    [error, errorInfo],
  );
  const currentPath =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/";
  const timestamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const handleCopy = () => {
    const report = [
      `=== Spinzyt Application Error Report ===`,
      `Time: ${new Date().toISOString()}`,
      `Route: ${currentPath}`,
      `Error: ${details.name}: ${details.message}`,
      details.sourceFile
        ? `Location: ${details.sourceFile}:${details.lineNumber || 0}:${details.columnNumber || 0}`
        : null,
      details.failingComponent
        ? `Component: <${details.failingComponent} />`
        : null,
      ``,
      `--- Component Stack ---`,
      details.componentStack || "(No component stack available)",
      ``,
      `--- Call Stack ---`,
      details.rawStack || "(No call stack available)",
      `========================================`,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard
      .writeText(report)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch((err) => {
        console.error("Failed to copy error report:", err);
      });
  };

  const handleGoHome = () => {
    if (onReset) onReset();
    window.location.href = "/";
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-4xl bg-slate-900/90 border border-red-500/30 rounded-2xl shadow-2xl shadow-red-950/20 backdrop-blur-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Application Error Caught
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                  {details.name}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                React Error Boundary intercepted an unhandled runtime exception.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 shadow-sm"
              title="Copy diagnostic error report to clipboard">
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Details Section */}
        <div className="p-6 space-y-6">
          {/* Main Error Message Card */}
          <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Bug className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-red-400/90 block">
                  Error Message
                </span>
                <p className="text-sm sm:text-base font-mono text-red-200 break-words leading-relaxed font-semibold">
                  {details.message}
                </p>
              </div>
            </div>
          </div>

          {/* Location & Metadata Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Detected Source Location */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center space-x-2 text-slate-400 mb-1">
                <FileCode className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Source File
                </span>
              </div>
              <div className="mt-1">
                {details.sourceFile ? (
                  <div className="font-mono text-xs text-amber-300 break-all font-semibold bg-amber-950/30 p-1.5 rounded border border-amber-500/20">
                    {details.sourceFile}
                    {details.lineNumber && (
                      <span className="text-amber-200 font-bold ml-1">
                        :{details.lineNumber}
                        {details.columnNumber ? `:${details.columnNumber}` : ""}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">
                    Unknown location
                  </span>
                )}
              </div>
            </div>

            {/* Failing Component */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center space-x-2 text-slate-400 mb-1">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Component
                </span>
              </div>
              <div className="mt-1">
                {details.failingComponent ? (
                  <div className="font-mono text-xs text-cyan-300 font-bold bg-cyan-950/30 p-1.5 rounded border border-cyan-500/20 truncate">
                    &lt;{details.failingComponent} /&gt;
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">
                    Global context
                  </span>
                )}
              </div>
            </div>

            {/* Current Route */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center space-x-2 text-slate-400 mb-1">
                <Compass className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Route Path
                </span>
              </div>
              <div className="mt-1">
                <div className="font-mono text-xs text-indigo-300 font-medium bg-indigo-950/30 p-1.5 rounded border border-indigo-500/20 truncate">
                  {currentPath}
                </div>
              </div>
            </div>

            {/* Time */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center space-x-2 text-slate-400 mb-1">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Occurred At
                </span>
              </div>
              <div className="mt-1">
                <div className="font-mono text-xs text-slate-300 font-medium bg-slate-800 p-1.5 rounded border border-slate-700">
                  {timestamp}
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Diagnostic Traces */}
          <div className="space-y-3">
            {/* Component Hierarchy Stack */}
            {details.componentStack && (
              <div className="border border-slate-800 bg-slate-950/70 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowComponentStack((prev) => !prev)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-300 bg-slate-900/60 hover:bg-slate-900 transition text-left">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    Component Tree Trace
                  </span>
                  {showComponentStack ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                </button>
                {showComponentStack && (
                  <div className="p-4 border-t border-slate-800/80 bg-slate-950 font-mono text-[11px] sm:text-xs text-cyan-200/90 overflow-x-auto max-h-48 leading-relaxed whitespace-pre scrollbar-thin">
                    {details.componentStack}
                  </div>
                )}
              </div>
            )}

            {/* JavaScript Call Stack */}
            {details.rawStack && (
              <div className="border border-slate-800 bg-slate-950/70 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowCallStack((prev) => !prev)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-300 bg-slate-900/60 hover:bg-slate-900 transition text-left">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    JavaScript Stack Trace
                  </span>
                  {showCallStack ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                </button>
                {showCallStack && (
                  <div className="p-4 border-t border-slate-800/80 bg-slate-950 font-mono text-[11px] sm:text-xs text-slate-400 overflow-x-auto max-h-48 leading-relaxed whitespace-pre scrollbar-thin">
                    {details.rawStack}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Recovery Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-800">
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 shadow-sm cursor-pointer">
                <RefreshCw className="w-4 h-4 text-slate-400" />
                <span>Try Again</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleGoHome}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 shadow-sm cursor-pointer">
              <Home className="w-4 h-4 text-slate-400" />
              <span>Go to Home</span>
            </button>

            <button
              type="button"
              onClick={handleReload}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 transition active:scale-95 cursor-pointer">
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * React Error Boundary Component
 * Catches errors thrown in child component tree rendering, lifecycle methods,
 * and constructors, displaying the dynamic ErrorFallbackScreen.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("🚨 ErrorBoundary caught an exception:", error, errorInfo);
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (err) {
        console.error("ErrorBoundary onError callback error:", err);
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === "function"
          ? this.props.fallback({
              error: this.state.error,
              errorInfo: this.state.errorInfo,
              onReset: this.handleReset,
            })
          : this.props.fallback;
      }

      return (
        <ErrorFallbackScreen
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
