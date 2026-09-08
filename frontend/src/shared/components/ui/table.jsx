import * as React from "react";
import { cn } from "@/lib/utils";

/* ─── Admin Table Primitives ──────────────────────────────────────────
   Styled to match DataGrid: dense rows, micro uppercase headers with
   wide tracking, flat 1px borders and sharp corners.
   ──────────────────────────────────────────────────────────────────── */

const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-x-auto">
    <table
      ref={ref}
      className={cn("w-full border-collapse text-left bg-white", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-slate-50/50 border-b border-slate-200 sticky top-0 z-20",
      className
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("divide-y divide-slate-100 bg-white", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-slate-100 bg-slate-50/50 [&>tr]:last:border-b-0",
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
      "group hover:bg-slate-50 transition-all border-b border-transparent hover:border-slate-200/50 data-[state=selected]:bg-slate-50",
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
      "px-5 py-3 text-left align-middle text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap select-none transition-all",
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
      "px-5 py-2.5 align-middle text-[12px] font-medium text-slate-700 tabular-nums tracking-tight",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      "mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest",
      className
    )}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

/* ─── StatusBadge: flat micro-label with dot ─────────────────────────── */
export function StatusBadge({ status, label, className }) {
  const norm = String(status || '').toLowerCase().trim();

  let theme = "bg-slate-50 text-slate-400 border-slate-100";
  let dotColor = "bg-slate-400";
  let displayLabel = label || status;

  if (['active', 'approved', 'verified', 'completed', 'paid', 'success'].includes(norm)) {
    theme = "bg-emerald-50 text-emerald-600 border-emerald-100";
    dotColor = "bg-emerald-600";
    displayLabel = label || 'Active';
  } else if (['pending', 'in progress', 'processing', 'review', 'revision_required', 'initial_review', 'final_review'].includes(norm)) {
    theme = "bg-amber-50 text-amber-600 border-amber-100";
    dotColor = "bg-amber-600 animate-pulse";
    displayLabel = label || 'Pending';
  } else if (['inactive', 'rejected', 'cancelled', 'failed', 'blocked', 'suspended'].includes(norm)) {
    theme = "bg-rose-50 text-rose-600 border-rose-100";
    dotColor = "bg-rose-600";
    displayLabel = label || 'Inactive';
  } else if (['draft', 'archived'].includes(norm)) {
    theme = "bg-slate-100 text-slate-500 border-slate-200";
    dotColor = "bg-slate-500";
    displayLabel = label || status;
  }

  return (
    <span
      className={cn(
        "px-2.5 py-1 rounded-[1px] text-[8px] font-bold uppercase tracking-[0.25em] border inline-flex items-center gap-1.5 hover:scale-[1.02] transition-transform",
        theme,
        className
      )}
    >
      <span className={cn("w-1 h-1 rounded-full shrink-0", dotColor)} />
      {displayLabel}
    </span>
  );
}

/* ─── TagBadge: flat micro-label ─────────────────────────────────────── */
export function TagBadge({ label, color = "slate", className }) {
  const colorMap = {
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    pink: "bg-pink-50 text-pink-600 border-pink-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    slate: "bg-slate-50 text-slate-400 border-slate-100",
  };

  const style = colorMap[color] || colorMap.slate;

  return (
    <span
      className={cn(
        "px-2.5 py-1 rounded-[1px] text-[8px] font-bold uppercase tracking-[0.25em] border inline-flex items-center whitespace-nowrap",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}

/* ─── UserAvatarCell: Avatar + Name + Subtitle ───────────────────────── */
export function UserAvatarCell({ name, subtitle, email, avatar, initials, className }) {
  const computedInitials = initials || (name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U');

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {avatar ? (
        <img
          src={avatar}
          alt={name || 'User'}
          className="w-8 h-8 rounded-sm object-cover shrink-0 border border-slate-200"
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
          "w-8 h-8 rounded-sm bg-slate-100 text-slate-500 font-bold text-[10px] items-center justify-center shrink-0 border border-slate-200 select-none tracking-widest",
          avatar ? "hidden" : "flex"
        )}
      >
        {computedInitials}
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-bold text-slate-900 truncate leading-tight">
          {name || 'Unknown'}
        </div>
        {(subtitle || email) && (
          <div className="text-[10px] text-slate-400 font-medium truncate leading-tight tracking-wide mt-0.5">
            {subtitle || email}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── TablePagination: flat Prev / PG nn / Next bar ──────────────────── */
export function TablePagination({
  page = 1,
  totalPages = 1,
  onPageChange,
  className
}) {
  const safeTotal = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotal);

  return (
    <div
      className={cn(
        "px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end transition-colors hover:bg-slate-100/30 select-none",
        className
      )}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange?.(safePage - 1)}
          className="p-1 px-3 border border-slate-200 text-[9px] font-bold uppercase tracking-widest rounded-sm bg-white hover:bg-slate-950 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Prev
        </button>
        <span className="px-4 text-[9px] font-black text-slate-900 tracking-widest tabular-nums bg-slate-200/50 h-6 flex items-center rounded-sm whitespace-nowrap">
          PG {String(safePage).padStart(2, '0')} / {String(safeTotal).padStart(2, '0')}
        </span>
        <button
          type="button"
          disabled={safePage >= safeTotal}
          onClick={() => onPageChange?.(safePage + 1)}
          className="p-1 px-3 border border-slate-200 text-[9px] font-bold uppercase tracking-widest rounded-sm bg-white hover:bg-slate-950 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Next
        </button>
      </div>
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
