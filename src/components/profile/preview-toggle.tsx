"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTransition } from "react";
import { setPreviewAsVisitor } from "@/app/(site)/[handle]/actions";
import { buttonClasses } from "@/components/ui/button";

export function PreviewToggle({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setPreviewAsVisitor(!enabled))}
      className={buttonClasses({
        variant: enabled ? "soft" : "ghost",
        size: enabled ? "md" : "icon",
        className: enabled ? "ring-1 ring-lilac/40" : "",
      })}
      title={enabled ? undefined : "Preview as a visitor"}
      aria-label={enabled ? undefined : "Preview as a visitor"}
    >
      {enabled ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      {enabled && "Exit visitor view"}
    </button>
  );
}
