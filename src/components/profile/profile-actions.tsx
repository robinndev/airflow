import Link from "next/link";
import { MessageCircle, Palette, Plus } from "lucide-react";
import { MessageButton } from "@/components/messages/message-button";
import { buttonClasses } from "@/components/ui/button";
import { fetchPlanForUser } from "@/lib/profile/accounts";
import { customizationFor } from "@/lib/customization/model";
import { getProfile } from "@/lib/profile/queries";
import { getViewer, isPreviewingAsVisitor } from "@/lib/session";
import { isFollowing } from "@/lib/social";
import { EditProfileButton } from "./edit-profile-dialog";
import { FollowButton } from "./follow-button";
import { ImagePickerButton } from "./image-picker-button";
import { PreviewToggle } from "./preview-toggle";

/*
 * Viewer-dependent pieces of the profile. They read cookies, so they render
 * per request inside <Suspense> while the rest of the profile stays static.
 */

/** `sells`: false for a collector (no artist access), who has no Commission button. */
export async function ProfileActions({ handle, sells = true }: { handle: string; sells?: boolean }) {
  const viewer = await getViewer();

  if (viewer?.handle === handle) {
    return (
      <>
        <OwnerEditButton handle={handle} />
        <Link href="/customize" className={buttonClasses({ variant: "soft" })}>
          <Palette aria-hidden />
          Customize
        </Link>
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
        {sells && (
          <Link href={`/${handle}/commissions`} className={buttonClasses({ variant: "soft" })}>
            Commission
          </Link>
        )}
      </>
    );
  }

  const profile = viewer && (await getProfile(handle));
  const following = Boolean(profile && (await isFollowing(viewer.id, profile)));

  return (
    <>
      <FollowButton handle={handle} initial={following} />
      <MessageButton handle={handle} />
      {sells && (
        <Link href={`/${handle}/commissions`} className={buttonClasses({ variant: "soft" })}>
          Commission
        </Link>
      )}
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
  const plan = await fetchPlanForUser(viewer.id);
  return <ImagePickerButton handle={handle} slot={slot} allowGif={plan === "flow_plus"} />;
}


/** "Edit profile", opened with the profile's current words, links, frame and name style. */
async function OwnerEditButton({ handle }: { handle: string }) {
  const profile = await getProfile(handle);
  if (!profile) return null;
  return (
    <EditProfileButton
      handle={profile.handle}
      avatar={profile.avatar}
      custom={customizationFor(profile)}
      initial={{
        displayName: profile.displayName,
        headline: profile.headline,
        bio: profile.bio,
        pronouns: profile.pronouns ?? "",
        location: profile.location ?? "",
        links: profile.links.map(({ url, label }) => ({ url, label })),
        draws: profile.draws,
      }}
    />
  );
}
