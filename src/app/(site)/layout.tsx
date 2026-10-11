import { FavoritesToast } from "@/components/favorites/favorites-toast";
import { ChatWindow } from "@/components/messages/chat-window";

// Each page renders its own <SiteHeader /> so profiles can float it over the banner.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-canvas">
      {children}
      {/* "Saved to favorites · View": save buttons anywhere on the site raise it. */}
      <FavoritesToast />
      {/* Messages open over any page and stay open across pages (the header and "Message" buttons open it). */}
      <ChatWindow />
    </div>
  );
}
