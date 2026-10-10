export type Plan = "free" | "pro";

export type ImageAsset = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** CSS object-position used when the image is cropped (e.g. avatars). */
  focus?: string;
};

export type AccentColor = "ocean" | "sky" | "mint" | "lilac";

export type ButtonShape = "rounded" | "pill" | "square";

export type SidebarPosition = "left" | "right";

/**
 * How an artist dresses up their profile.
 *
 * Free tier: a small, safe set of choices that never breaks readability.
 * Pro tier (US$5/mo): progressively more control — button shapes, block
 * positions, and later themes, fonts, palettes, extra sections and
 * sandboxed custom CSS. Navigation, checkout and safety UI always stay fixed.
 *
 * Gating lives in `resolveAppearance()` so premium fields are simply ignored
 * (not deleted) when a subscription lapses.
 */
export type ProfileAppearance = {
  // Free
  accent: AccentColor;
  /** Vertical focal point of the banner, 0–100 (CSS object-position). */
  bannerFocusY: number;

  // Pro
  buttonShape?: ButtonShape;
  sidebarPosition?: SidebarPosition;
};

export type ResolvedAppearance = Required<ProfileAppearance>;

export type CommissionStatus = "open" | "waitlist" | "closed";

export type CommissionSummary = {
  status: CommissionStatus;
  slotsTotal: number;
  slotsTaken: number;
  startingPriceUsd: number;
  turnaround: string;
  types: string[];
};

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "x"
  | "youtube"
  | "twitch"
  | "bluesky"
  | "kofi"
  | "website";

export type SocialLink = {
  platform: SocialPlatform;
  label: string;
  url: string;
};

export type ArtistProfile = {
  id: string;
  handle: string;
  displayName: string;
  pronouns?: string;
  headline: string;
  bio: string;
  location?: string;
  joinedAt: string;
  plan: Plan;
  avatar: ImageAsset;
  banner: ImageAsset;
  stats: {
    followers: number;
    following: number;
    artworks: number;
  };
  /** Highlighted "open to work" status, shown next to the name when set. */
  availability?: { note: string };
  commissions: CommissionSummary;
  gallery: {
    total: number;
    preview: ImageAsset[];
  };
  links: SocialLink[];
  appearance: ProfileAppearance;
};

export type PostKind = "finished" | "wip" | "sketch" | "update";

export type Post = {
  id: string;
  authorHandle: string;
  kind: PostKind;
  body: string;
  media: ImageAsset[];
  createdAt: string;
  pinned?: boolean;
  likes: number;
  comments: number;
};

/** Public author info embedded in each post card. */
export type PostAuthor = Pick<
  ArtistProfile,
  "handle" | "displayName" | "avatar" | "plan"
>;
