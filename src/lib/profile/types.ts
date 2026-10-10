export type Plan = "free" | "pro";

export type ImageAsset = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** CSS object-position used when the image is cropped (e.g. avatars). */
  focus?: string;
  /**
   * Dominant colors, most prominent first, with flat backdrops (white paper,
   * cream) left out. Extracted on upload; powers palette browsing, character
   * swatches and the placeholder tint while the image loads.
   */
  palette?: string[];
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
  rating?: { average: number; count: number };
  /** Message shown to buyers before they request (terms, expectations). */
  note?: string;
  /** Artist's Terms of Service, accepted before every request. */
  terms?: { title: string; items: string[] }[];
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

export type UsageRights = {
  personal: boolean;
  commercialContent: boolean;
  commercialMerch: boolean;
};

export type CommissionService = {
  id: string;
  ownerHandle: string;
  category: string;
  title: string;
  usage: UsageRights;
  discountPercent?: number;
  description: string;
  priceFromUsd: number;
  turnaround: string;
  includes: string[];
  examples: ImageAsset[];
  popular?: boolean;
};

export type Review = {
  id: string;
  artistHandle: string;
  author: string;
  authorAvatar?: ImageAsset;
  rating: number;
  text: string;
  serviceTitle: string;
  createdAt: string;
};

export type CommissionBudget = "under-50" | "50-150" | "150-300" | "300-plus";
export type CommissionUsage = "personal" | "commercial";

export type CommissionRequest = {
  id: string;
  artistHandle: string;
  requesterHandle: string | null;
  /** A service id, or "custom". */
  serviceId: string;
  description: string;
  usage: CommissionUsage;
  budget?: CommissionBudget;
  deadline?: string;
  references?: string;
  acceptedTerms: true;
  createdAt: string;
};

export type ArtworkKind = "commission" | "personal" | "adoptable";

export type Artwork = {
  id: string;
  ownerHandle: string;
  title: string;
  image: ImageAsset;
  kind: ArtworkKind;
  /** Commissions: who it was made for. */
  client?: string;
  /** Adoptables: listing state. */
  adopt?: { priceUsd: number; status: "available" | "sold" };
  likes: number;
  createdAt: string;
};

export type PostKind = "finished" | "wip" | "sketch" | "update";

export type PostEmbed =
  | { type: "service"; serviceId: string }
  | { type: "adoptable"; artworkId: string };

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
  /** Marketplace card attached to the post (a service or an adoptable). */
  embed?: PostEmbed;
  /** Repost with comment. */
  quotePostId?: string;
  topComment?: { author: string; text: string };
};

/** Public author info embedded in each post card. */
export type PostAuthor = Pick<
  ArtistProfile,
  "handle" | "displayName" | "avatar" | "plan"
>;
