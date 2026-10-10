"use client";

import type { ReactNode } from "react";
import { openService } from "./events";

export function OpenServiceButton({
  serviceId,
  className,
  children,
  label,
}: {
  serviceId: string;
  className?: string;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => openService(serviceId)}
      className={className}
    >
      {children}
    </button>
  );
}
