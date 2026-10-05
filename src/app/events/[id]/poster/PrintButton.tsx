"use client";

/** Opens the browser's print dialog — the poster page is already laid out for it. */
export function PrintButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      Print this poster
    </button>
  );
}
