"use client";

import { MessageCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { openChat } from "./store";

/** Opens the chat with `handle` over the page; visitors sign in first and come back. */
function useOpenChat(handle: string) {
  const router = useRouter();
  const pathname = usePathname();
  return () => {
    if (!openChat(handle)) router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
  };
}

/** "Message" on a profile: opens the chat window with that artist, over the page. */
export function MessageButton({ handle }: { handle: string }) {
  const open = useOpenChat(handle);
  return (
    <button type="button" onClick={open} className={buttonClasses({ variant: "secondary" })}>
      <MessageCircle aria-hidden />
      Message
    </button>
  );
}

/** A small round "Message …" beside someone's name (request postcards, order slips). Color it with `className`. */
export function MessageIconButton({ handle, name, className = "" }: { handle: string; name: string; className?: string }) {
  const open = useOpenChat(handle);
  return (
    <button
      type="button"
      onClick={open}
      aria-label={`Message ${name}`}
      title={`Message ${name}`}
      className={`grid size-8 shrink-0 place-items-center rounded-full transition-colors ${className}`}
    >
      <MessageCircle aria-hidden className="size-4" />
    </button>
  );
}
