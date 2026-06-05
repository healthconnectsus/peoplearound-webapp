"use client";

import type { ReactNode } from "react";

/** A submit button that asks for confirmation before allowing the submit. */
export function ConfirmSubmit({
  children,
  className,
  message,
}: {
  children: ReactNode;
  className?: string;
  message: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
