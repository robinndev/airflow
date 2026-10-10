import Link from "next/link";
import { MessageCircle, Palette, Pencil, Plus } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { getProfile } from "@/lib/profile/queries";
import { getViewer, isPreviewingAsVisitor } from "@/lib/session";
import { FollowButton } from "./follow-button";
import { ImagePickerButton } from "./image-picker-button";
import { PreviewToggle } from "./preview-toggle";

/*
 * Viewer-dependent pieces of the profile. They read cookies, so they render
 * per request inside <Suspense> while the rest of the profile stays static.
 */

export async function ProfileActions({ handle }: { handle: string }) {
  const viewer = await getViewer();

  if (viewer?.handle === handle) {
    return (
      <>
        <button type="button" className={buttonClasses({ variant: "secondary" })}>
          <Pencil aria-hidden />
          Edit profile
        </button>
        <button type="button" className={buttonClasses({ variant: "soft" })}>
          <Palette aria-hidden />
          Customize
        </button>
        <PreviewToggle enabled={false} />
      </>
    );
  }

  const previewing = await isPreviewingAsVisitor();

  // Signed out: following and messaging start at sign-in, then come back here.
  if (!viewer && !previewing) {
    const signIn = `/sign-in?next=${encodeURIComponent(`/${handle}`)}`;
    return (
      <>
        <Link href={signIn} className={buttonClasses({ className: "min-w-28" })}>
          <Plus aria-hidden />
          Follow
        </Link>
        <Link href={signIn} className={buttonClasses({ variant: "secondary" })}>
          <MessageCircle aria-hidden />
          Message
        </Link>
        <Link href={`/${handle}/commissions`} className={buttonClasses({ variant: "soft" })}>
          Commission
        </Link>
      </>
    );
  }

  return (
    <>
      <FollowButton handle={handle} />
      <button type="button" className={buttonClasses({ variant: "secondary" })}>
        <MessageCircle aria-hidden />
        Message
      </button>
      <Link
        href={`/${handle}/commissions`}
        className={buttonClasses({ variant: "soft" })}
      >
        Commission
      </Link>
      {previewing && <PreviewToggle enabled />}
    </>
  );
}

export async function OwnerImageControls({
  handle,
  slot,
}: {
  handle: string;
  slot: "avatar" | "banner";
}) {
  const viewer = await getViewer();
  if (viewer?.handle !== handle) return null;
  const profile = await getProfile(handle);
  return <ImagePickerButton handle={handle} slot={slot} allowGif={profile?.plan === "pro"} />;
}

