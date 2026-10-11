import { demoImages as art, demoPool } from "@/lib/profile/demo-images";
import type { ImageAsset } from "@/lib/profile/types";
import type { QueueOrder } from "./queue";

/*
 * SAMPLE ONLY: the queue every artist sees until the commission flow brings
 * real requests (docs/roadmap.md). Clients and characters are made up; the
 * art is the demo set (see demo-images.ts). Dates are relative to today, so
 * deadlines always read as they would on a real board.
 */

const asset = ({ src, alt, width, height, focus, palette }: ImageAsset): ImageAsset => ({
  src, alt, width, height, focus, palette,
});

const byId = new Map(demoPool.map((image) => [image.src.split("/").pop()!.split(".")[0], image]));
const pool = (id: string) => asset(byId.get(id)!);

/** A client's picture, cropped from their character's art. */
const face = (image: ImageAsset, focus: string): ImageAsset => ({ ...asset(image), alt: "", focus });

const DAY = 86_400_000;

export function sampleQueue(now: Date): QueueOrder[] {
  const at = (days: number, hour = 15) => {
    const date = new Date(now.getTime() + days * DAY);
    date.setUTCHours(hour, (days * 37 + hour * 11) % 60, 0, 0);
    return date.toISOString();
  };
  // Asked two hours ago, whatever the time is now.
  const justNow = new Date(now.getTime() - 2 * 3_600_000).toISOString();

  const moth = pool("12253474");
  const mothWide = pool("12296405");
  const fox = pool("12316668");
  const foxAlt = pool("12322633");
  const bramble = pool("11755983");
  const juniper = pool("12338874");
  const map = pool("12292914");
  const mapAlt = pool("12327459");
  const ronin = pool("11805058");
  const pebble = pool("12057737");
  const cinder = pool("12178737");
  const mochi = pool("12341813");
  const aster = pool("12307987");

  return [
    {
      id: "ord_0051",
      number: 51,
      client: { handle: "marrow.moth", name: "Marrow", avatar: face(mothWide, "50% 30%") },
      character: { name: "Lumen", palette: moth.palette! },
      service: "Full-body illustration",
      priceUsd: 140,
      lane: "request",
      payment: "unpaid",
      usage: "personal",
      brief:
        "Lumen is a moth girl who lives inside a lighthouse lamp. I'd love her curled up on the lens at night, glowing a little. The wings matter most to me, they're in every ref!",
      references: [moth, mothWide],
      requestedAt: justNow,
    },
    {
      id: "ord_0050",
      number: 50,
      client: { handle: "kitsune.kei", name: "Kei", avatar: face(foxAlt, "50% 18%") },
      character: { name: "Kei", palette: fox.palette! },
      service: "Emote pack (5)",
      priceUsd: 90,
      extras: [{ label: "Commercial: Content", priceUsd: 30 }],
      lane: "request",
      payment: "unpaid",
      usage: "commercial",
      brief:
        "Five emotes for my Twitch channel: hype, cry, love, sleepy and a bonk. Kei's ears should stay big even at 28px. They'll be used on stream and Discord.",
      references: [fox, foxAlt],
      requestedAt: at(-1, 21),
    },
    {
      id: "ord_0049",
      number: 49,
      client: { handle: "bramblefox", name: "Bramble", avatar: face(bramble, "50% 20%") },
      character: { name: "Bramble", palette: bramble.palette! },
      service: "Reference sheet",
      priceUsd: 180,
      lane: "request",
      waitlist: true,
      payment: "unpaid",
      usage: "personal",
      brief: "A full ref sheet for my forest fox: front, back, an expression bust and the palette. No rush at all, happy to wait for a slot!",
      references: [bramble],
      requestedAt: at(-6, 10),
    },
    {
      id: "ord_0048",
      number: 48,
      client: { handle: "juniper.jpg", name: "Juniper", avatar: face(juniper, "50% 30%") },
      character: { name: "Juniper", palette: juniper.palette! },
      service: "Headshot",
      priceUsd: 65,
      extras: [
        { label: "Full shading", priceUsd: 10 },
        { label: "Animated blink", priceUsd: 10 },
      ],
      lane: "proposal",
      payment: "invoiced",
      usage: "personal",
      brief: "A soft headshot of Juniper for my profile picture. Pastel, a bit sleepy, flower clip on the left side please.",
      references: [juniper],
      requestedAt: at(-3, 13),
      proposalExpiresAt: at(2, 13),
    },
    {
      id: "ord_0047",
      number: 47,
      client: { handle: "sol.sundry", name: "Sol & Sundry", avatar: face(mapAlt, "50% 40%") },
      character: { name: "The Cartographer", palette: map.palette! },
      service: "Book cover (custom)",
      priceUsd: 320,
      lane: "proposal",
      payment: "invoiced",
      usage: "commercial",
      brief:
        "Cover art for our small press's next novel. The Cartographer standing on a cliff over a valley of paper maps. Print run of 2,000, so commercial rights are needed.",
      references: [map, mapAlt],
      requestedAt: at(-4, 9),
      proposalExpiresAt: at(1, 9),
    },
    {
      id: "ord_0046",
      number: 46,
      client: { handle: "lune.oc", name: "Lune", avatar: face(art.silverHair, "50% 12%") },
      character: { name: "Lune", palette: art.silverHair.palette },
      service: "Half-body illustration",
      priceUsd: 85,
      lane: "queued",
      payment: "paid",
      usage: "personal",
      brief: "Lune in her black off-shoulder top, looking back over her shoulder. Moonlight, silver hair catching the light.",
      references: [asset(art.silverHair)],
      requestedAt: at(-5, 18),
      paidAt: at(-2, 11),
      dueAt: at(16),
    },
    {
      id: "ord_0045",
      number: 45,
      client: { handle: "ronin.wolf", name: "Ronin", avatar: face(art.campfire, "70% 30%") },
      character: { name: "Ronin", palette: ronin.palette! },
      service: "Full-body illustration",
      priceUsd: 140,
      lane: "wip",
      step: "sketch",
      payment: "paid",
      usage: "personal",
      brief: "Ronin by a campfire, full body, sword across his knees. It's a birthday gift for him, so the scar over his eye has to be there.",
      references: [ronin, asset(art.campfire)],
      requestedAt: at(-10, 16),
      paidAt: at(-6, 12),
      dueAt: at(9),
    },
    {
      id: "ord_0044",
      number: 44,
      client: { handle: "nadiadraws", name: "Nadia", avatar: face(art.nightDrive, "50% 15%") },
      character: { name: "Nadia", palette: art.nightDrive.palette },
      service: "Half-body illustration",
      priceUsd: 115,
      extras: [{ label: "Detailed background", priceUsd: 30 }],
      lane: "wip",
      step: "flats",
      payment: "paid",
      usage: "personal",
      brief: "My OC Nadia on a rainy rooftop, neon reflections everywhere, cap on backwards.",
      references: [asset(art.nightDrive)],
      requestedAt: at(-14, 20),
      paidAt: at(-12, 9),
      dueAt: at(2),
      note: "She wants the neon in teal, not pink.",
    },
    {
      id: "ord_0043",
      number: 43,
      client: { handle: "pebblecat", name: "Pebble", avatar: face(pebble, "50% 40%") },
      character: { name: "Pebble", palette: pebble.palette! },
      service: "Animated pixel icon",
      priceUsd: 70,
      lane: "wip",
      step: "render",
      payment: "paid",
      usage: "personal",
      private: true,
      brief: "A tiny animated icon of Pebble blinking and wiggling her ears, 8 frames, loop. It's a surprise, please don't post it until after the 20th!",
      references: [pebble],
      requestedAt: at(-21, 14),
      paidAt: at(-19, 10),
      dueAt: at(-1),
    },
    {
      id: "ord_0042",
      number: 42,
      client: { handle: "theowrites", name: "Theo", avatar: face(art.kitchenMorning, "50% 12%") },
      character: { name: "Theo & Biscuit", palette: art.kitchenMorning.palette },
      service: "Scene illustration",
      priceUsd: 260,
      lane: "wip",
      step: "lineart",
      payment: "paid",
      usage: "personal",
      paused: true,
      pausedReason: "Waiting on new references for Biscuit (the dog).",
      brief: "Sunday morning in our kitchen: Theo making pancakes, Biscuit begging at his feet, sunlight through the window.",
      references: [asset(art.kitchenMorning)],
      requestedAt: at(-30, 11),
      paidAt: at(-27, 15),
      dueAt: at(20),
    },
    {
      id: "ord_0041",
      number: 41,
      client: { handle: "cinder.cat", name: "Cinder", avatar: face(cinder, "50% 35%") },
      character: { name: "Cinder", palette: cinder.palette! },
      service: "Headshot",
      priceUsd: 45,
      lane: "delivered",
      step: "render",
      payment: "paid",
      usage: "personal",
      brief: "Cinder's headshot for my Discord, warm colors, little ember on her nose.",
      references: [cinder],
      requestedAt: at(-18, 12),
      paidAt: at(-16, 9),
      dueAt: at(-2),
      deliveredAt: at(-3, 19),
    },
    {
      id: "ord_0040",
      number: 40,
      client: { handle: "cloudberry", name: "Cloudberry", avatar: face(mochi, "50% 35%") },
      character: { name: "Mochi", palette: mochi.palette! },
      service: "Chibi",
      priceUsd: 35,
      lane: "delivered",
      step: "render",
      payment: "paid",
      usage: "personal",
      brief: "Mochi as a chibi holding a strawberry bigger than her head.",
      references: [mochi],
      requestedAt: at(-24, 17),
      paidAt: at(-22, 10),
      dueAt: at(-6),
      deliveredAt: at(-9, 16),
    },
    {
      id: "ord_0039",
      number: 39,
      client: { handle: "aster.ink", name: "Aster", avatar: face(aster, "50% 15%") },
      character: { name: "Aster", palette: aster.palette! },
      service: "Half-body illustration",
      priceUsd: 85,
      lane: "delivered",
      step: "render",
      payment: "paid",
      usage: "personal",
      archived: true,
      brief: "Aster in autumn colors with her scarf, half-body.",
      references: [aster],
      requestedAt: at(-70, 12),
      paidAt: at(-66, 10),
      dueAt: at(-40),
      deliveredAt: at(-41, 18),
    },
    {
      id: "ord_0038",
      number: 38,
      client: { handle: "gachaforge", name: "Gachaforge", avatar: face(pool("12287050"), "50% 50%") },
      service: "Custom piece",
      priceUsd: 50,
      lane: "request",
      payment: "unpaid",
      usage: "commercial",
      archived: true,
      declined: true,
      brief: "Thirty character portraits for our mobile game, all rights included, two weeks.",
      references: [],
      requestedAt: at(-12, 8),
      note: "Declined: not a fit (scope, full rights).",
    },
  ];
}
