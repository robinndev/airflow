import type { Board } from "@/lib/customization/about";
import type { Customization } from "@/lib/customization/model";
import type { AdoptStatus, ServiceCategory, StyleTag } from "@/lib/listings/catalog";
import type { DrawTag } from "./draws";

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
  /** Animated GIFs: a still frame (their thumb), for walls that play GIFs only on screen. */
  still?: string;
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
  /** Ready-made characters for sale (filled in by `getProfile`); absent = none listed. */
  adopts?: { total: number; available: number; preview: ImageAsset[] };
  gallery: {
    total: number;
    preview: ImageAsset[];
  };
  links: SocialLink[];
  /** What they draw: subjects and specialties (src/lib/profile/draws.ts). Empty = not said. */
  draws: DrawTag[];
  appearance: ProfileAppearance;
  /**
   * Full customization as saved (src/lib/customization). Gate it with the
   * plan before applying (`gateCustomization`); absent = defaults.
   */
  customization?: Customization;
  /** The About board; absent or empty = no About tab content yet. */
  about?: Board;
};

/**
 * How a license or an add-on is priced: already in the price (shown ticked and
 * locked), a fixed amount, or a share of the "from" price ("+200%").
 */
export type AddonPrice =
  | { kind: "included" }
  | { kind: "fixed"; usd: number }
  | { kind: "percent"; percent: number };

/** Each license is included, sold on top (an `AddonPrice`), or not offered (null). */
export type UsageRights = {
  personal: AddonPrice | null;
  commercialContent: AddonPrice | null;
  commercialMerch: AddonPrice | null;
};

/**
 * An extra the buyer can tick when requesting ("+$10 shading"), or one that's
 * already in the price (ticked and locked). Only some services have them.
 */
export type ServiceAddon = {
  id: string;
  label: string;
  price: AddonPrice;
  /** A short clarification under the label ("A short loop, GIF and MP4"). */
  hint?: string;
};

/** A step of the same piece ("Sketch", "Lineart", "Full color"), with its price and what it adds. */
export type ServicePackage = {
  id: string;
  label: string;
  priceUsd: number;
  includes: string[];
};

/**
 * Made to order: the buyer requests, the artist quotes, then draws. Demo
 * artists' services live in mock-db.ts; real ones in Supabase (`services`,
 * src/lib/listings/server.ts).
 */
export type CommissionService = {
  id: string;
  ownerHandle: string;
  category: ServiceCategory;
  /** How it looks (up to four); search filters by it. */
  styles?: StyleTag[];
  title: string;
  usage: UsageRights;
  discountPercent?: number;
  description: string;
  /** The cheapest package, or the one price when there are no packages. */
  priceFromUsd: number;
  turnaround: string;
  /** The same turnaround in days, so discovery can filter by it. */
  turnaroundDays: { min: number; max: number };
  /** What every package includes. */
  includes: string[];
  examples: ImageAsset[];
  popular?: boolean;
  /** Optional extras the buyer can add. Absent or empty: the service has none. */
  addons?: ServiceAddon[];
  /** Sketch → lineart → full color, cheapest first. Absent: one price. */
  packages?: ServicePackage[];
  /** The service's own status. Absent: the artist's (demo artists). */
  status?: CommissionStatus;
  /** Its own slots; null = no limit. Absent: the artist's (demo artists). */
  slots?: { total: number; taken: number } | null;
  /** What it switches to when the last slot goes. */
  whenFull?: "waitlist" | "closed";
  /** Closed by "Pause all" (it reopens as it was on resume). */
  paused?: boolean;
  createdAt?: string;
};

/**
 * Ready-made: a character that's already drawn, sold once at a fixed price.
 * Whoever pays first owns it (no request, no quote).
 */
export type Adoptable = {
  id: string;
  ownerHandle: string;
  name: string;
  species: string;
  description: string;
  /** The first is the cover. */
  images: ImageAsset[];
  priceUsd: number;
  includes: string[];
  status: AdoptStatus;
  createdAt: string;
  soldAt?: string;
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
  /** The package they picked, priced when they asked. */
  package?: { id: string; label: string; priceUsd: number };
  /** What the buyer ticked on top (licenses and add-ons), priced in USD when they asked; later price changes don't touch it. */
  addons?: { id: string; label: string; priceUsd: number }[];
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
  /** Repost: the post this one pins (a real post's uuid or a demo `pst_` id). The note is optional. */
  quotePostId?: string;
  /** Demo data only: a made-up first comment, shown as the start of the thread. */
  topComment?: { author: string; text: string };
  /** The reposted original, ready to show (filled in by `hydratePosts`). */
  quoted?: { post: Post; author: PostAuthor };
  /** How many times it was reposted (filled in by `hydratePosts`). */
  reposts?: number;
  /** Newest top-level comment, for the feed's margin note (filled in by `hydratePosts`). */
  latestComment?: PostComment;
};

export type PostComment = {
  id: string;
  author: PostAuthor;
  body: string;
  createdAt: string;
  /** Replies hang off a top-level comment (one level deep). */
  parentId: string | null;
  /** The made-up first comment of a demo post: can't be replied to or deleted. */
  seed?: boolean;
};

/** A top-level comment with its replies, oldest first. */
export type CommentThread = PostComment & { replies: PostComment[] };

/** Public author info embedded in each post card. */
export type PostAuthor = Pick<
  ArtistProfile,
  "handle" | "displayName" | "avatar" | "plan"
>;
