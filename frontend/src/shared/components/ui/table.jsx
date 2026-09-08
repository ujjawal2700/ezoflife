import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-react";

/* ─── UntitledUI / Modern Clean SaaS Table Primitives ─
   - Increased font size for enhanced legibility across all displays
   - Clean, spacious header and cell padding
   - UntitledUI status pills with colored dots and 3-piece pagination
   ──────────────────────────────────────────────────────────────────── */

const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-x-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-[14.5px] border-collapse bg-white", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-slate-50/90 border-b border-slate-200 sticky top-0 z-10",
      className
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("divide-y divide-slate-200/70 bg-white [&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-slate-200 bg-slate-50/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-slate-200/70 transition-colors hover:bg-slate-50/80 data-[state=selected]:bg-slate-50",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-6 text-left align-middle font-semibold text-[13.5px] text-slate-700 whitespace-nowrap select-none tracking-normal",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-6 py-4.5 align-middle text-[14.5px] font-normal text-slate-700 leading-normal",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-slate-500", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

/* ─── StatusBadge: Pill with colored dot (matches UntitledUI) ────────── */
export function StatusBadge({ status, label, className }) {
  const norm = String(status || '').toLowerCase().trim();
  
  let theme = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
  let dotColor = "bg-emerald-500";
  let displayLabel = label || 'Active';

  if (['active', 'approved', 'verified', 'completed', 'paid', 'success'].includes(norm)) {
    theme = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    dotColor = "bg-emerald-500";
    displayLabel = label || 'Active';
  } else if (['pending', 'in progress', 'processing', 'review', 'revision_required', 'initial_review', 'final_review'].includes(norm)) {
    theme = "bg-amber-50 text-amber-700 border-amber-200/80";
    dotColor = "bg-amber-500";
    displayLabel = label || 'Pending';
  } else if (['inactive', 'rejected', 'cancelled', 'failed', 'blocked', 'suspended'].includes(norm)) {
    theme = "bg-rose-50 text-rose-700 border-rose-200/80";
    dotColor = "bg-rose-500";
    displayLabel = label || 'Inactive';
  } else if (['draft', 'archived'].includes(norm)) {
    theme = "bg-slate-100 text-slate-700 border-slate-200";
    dotColor = "bg-slate-400";
    displayLabel = label || status;
  } else {
    theme = "bg-slate-50 text-slate-700 border-slate-200";
    dotColor = "bg-slate-400";
    displayLabel = label || status;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[13px] font-medium border whitespace-nowrap",
        theme,
        className
      )}
    >
      <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
      {displayLabel}
    </span>
  );
}

/* ─── TagBadge: Soft pill tag (matches Teams / Tags in UntitledUI) ───── */
export function TagBadge({ label, color = "purple", className }) {
  const colorMap = {
    purple: "bg-purple-50 text-purple-700 border-purple-200/80",
    blue: "bg-blue-50 text-blue-700 border-blue-200/80",
    pink: "bg-pink-50 text-pink-700 border-pink-200/80",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    amber: "bg-amber-50 text-amber-700 border-amber-200/80",
    slate: "bg-slate-100 text-slate-700 border-slate-200/80",
  };

  const style = colorMap[color] || colorMap.slate;

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-[13px] font-medium border whitespace-nowrap",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}

/* ─── UserAvatarCell: Avatar + Name + Subtitle (matches UntitledUI) ──── */
export function UserAvatarCell({ name, subtitle, email, avatar, initials, className }) {
  const computedInitials = initials || (name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U');

  return (
    <div className={cn("flex items-center gap-3.5", className)}>
      {avatar ? (
        <img
          src={avatar}
          alt={name || 'User'}
          className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            if (e.currentTarget.nextElementSibling) {
              e.currentTarget.nextElementSibling.style.display = 'flex';
            }
          }}
        />
      ) : null}
      <div
        className={cn(
          "w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-semibold text-sm flex items-center justify-center shrink-0 border border-slate-200 select-none",
          avatar ? "hidden" : "flex"
        )}
      >
        {computedInitials}
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-semibold text-slate-900 truncate leading-snug">
          {name || 'Unknown'}
        </div>
        {(subtitle || email) && (
          <div className="text-[13px] text-slate-500 font-normal truncate leading-snug mt-0.5">
            {subtitle || email}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── TablePagination: Exact 3-part UntitledUI pagination bar ────────── */
export function TablePagination({
  page = 1,
  totalPages = 1,
  onPageChange,
  className
}) {
  const safeTotal = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotal);

  const getPageNumbers = () => {
    if (safeTotal <= 7) {
      return Array.from({ length: safeTotal }, (_, i) => i + 1);
    }
    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, '...', safeTotal];
    }
    if (safePage >= safeTotal - 3) {
      return [1, '...', safeTotal - 4, safeTotal - 3, safeTotal - 2, safeTotal - 1, safeTotal];
    }
    return [1, '...', safePage - 1, safePage, safePage + 1, '...', safeTotal];
  };

  const pages = getPageNumbers();

  return (
    <div
      className={cn(
        "px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-4 select-none",
        className
      )}
    >
      {/* Left: Previous Button */}
      <button
        type="button"
        disabled={safePage <= 1}
        onClick={() => onPageChange?.(safePage - 1)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        <ArrowLeft size={16} className="text-slate-500" />
        Previous
      </button>

      {/* Center: Numbered Page Buttons */}
      <div className="hidden sm:flex items-center gap-1.5">
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="w-10 h-10 flex items-center justify-center text-sm font-medium text-slate-400"
              >
                ...
              </span>
            );
          }
          const isActive = p === safePage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange?.(p)}
              className={cn(
                "w-10 h-10 rounded-lg text-sm font-medium flex items-center justify-center transition-colors cursor-pointer",
                isActive
                  ? "bg-slate-100 text-slate-900 font-semibold border border-slate-200"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {p}
            </button>
          );
        })}
      </div>

      {/* Right: Next Button */}
      <button
        type="button"
        disabled={safePage >= safeTotal}
        onClick={() => onPageChange?.(safePage + 1)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        Next
        <ArrowRight size={16} className="text-slate-500" />
      </button>
    </div>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
