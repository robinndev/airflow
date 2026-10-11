"use client";

import { MessageCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { openChat } from "./store";

/** "Message" on a profile: opens the chat window with that artist, over the page. Visitors sign in first. */
export function MessageButton({ handle }: { handle: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <button
      type="button"
      onClick={() => {
        if (!openChat(handle)) router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
      }}
      className={buttonClasses({ variant: "secondary" })}
    >
      <MessageCircle aria-hidden />
      Message
    </button>
  );
}
