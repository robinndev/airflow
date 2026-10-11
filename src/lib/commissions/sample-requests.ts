import { demoImages as art, demoPool } from "@/lib/profile/demo-images";
import { defaultArt } from "@/lib/profile/default-art";
import { db } from "@/lib/profile/mock-db";
import type { ImageAsset } from "@/lib/profile/types";
import type { MyRequest } from "./requests";

/*
 * SAMPLE ONLY: the requests every signed-in buyer sees until the commission
 * flow brings real quotes, payments and deliveries (docs/roadmap.md). The
 * artists are the demo artists; the art is the demo set (demo-images.ts).
 * Requests the viewer really sent through a commission dialog (the in-memory
 * `db.requests`) are added on top, as "sent".
 */

const asset = ({ src, alt, width, height, focus, palette }: ImageAsset): ImageAsset => ({
  src, alt, width, height, focus, palette,
});
const byId = new Map(demoPool.map((image) => [image.src.split("/").pop()!.split(".")[0], image]));
const pool = (id: string) => asset(byId.get(id)!);

const DAY = 86_400_000;

/** A demo artist from the mock store; real accounts (custom requests) get their generated picture. */
function artist(handle: string): MyRequest["artist"] {
  const profile = db.profiles.find((p) => p.handle === handle);
  if (profile) return { handle, name: profile.displayName, avatar: { ...asset(profile.avatar), alt: "" } };
  return { handle, name: `@${handle}`, avatar: { ...defaultArt(handle, handle).avatar, alt: "" } };
}

const service = (id: string) => db.services.find((s) => s.id === id)!;

export function sampleRequests(now: Date): MyRequest[] {
  const at = (days: number, hour = 15) => {
    const date = new Date(now.getTime() + days * DAY);
    date.setUTCHours(hour, (days * 23 + hour * 7) % 60, 0, 0);
    return date.toISOString();
  };
  const wren = { name: "Wren", palette: ["#4b6a84", "#e2d6d3", "#cda79f", "#2f2623"] };
  const biscuit = { name: "Biscuit", palette: ["#d1c0b0", "#a69584", "#5e4f4d", "#f3b397"] };

  return [
    {
      id: "rq_headshot",
      artist: artist("mira"),
      service: service("svc_headshot").title,
      cover: asset(art.silverHair),
      character: wren,
      brief: "Wren, my sleepy bard, for a new profile picture. Soft light, the little lute charm on her collar.",
      status: "quoted",
      priceUsd: 65,
      extras: [
        { label: "Full shading", priceUsd: 10 },
        { label: "Animated blink", priceUsd: 10 },
      ],
      sentAt: at(-3, 20),
      quotedAt: at(-1, 11),
      quoteExpiresAt: at(2, 11),
    },
    {
      id: "rq_halfbody",
      artist: artist("mira"),
      service: service("svc_halfbody").title,
      cover: asset(art.nightDrive),
      character: wren,
      brief: "Wren busking on a rainy street at night, neon reflections in the puddles, lute case open at her feet.",
      status: "paid",
      step: "lineart",
      priceUsd: 115,
      extras: [{ label: "Detailed background", priceUsd: 30 }],
      sentAt: at(-24, 18),
      quotedAt: at(-22, 10),
      paidAt: at(-20, 9),
      dueAt: at(5),
      progress: asset(art.cityRain),
    },
    {
      id: "rq_chibi",
      artist: artist("kai"),
      service: service("svc_chibi").title,
      cover: asset(art.plushBunny),
      character: biscuit,
      brief: "Biscuit (my corgi OC) as a chibi holding a giant cinnamon roll. For my Discord emotes!",
      status: "paid",
      priceUsd: 40,
      extras: [{ label: "Emote-ready sizes", priceUsd: 10 }],
      sentAt: at(-6, 16),
      quotedAt: at(-4, 12),
      paidAt: at(-2, 13),
      dueAt: at(12),
    },
    {
      id: "rq_stickers",
      artist: artist("nadiadraws"),
      service: "Sticker sheet (6)",
      cover: pool("12338874"),
      character: wren,
      brief: "Six stickers of Wren's moods: tired, delighted, plotting, crying, singing and asleep on her lute.",
      status: "sent",
      priceUsd: 60,
      sentAt: at(-1, 22),
    },
    {
      id: "rq_adopt",
      artist: artist("kai"),
      service: service("svc_adopt").title,
      cover: asset(art.bunnyAdopt),
      brief: "A moth-bunny hybrid in dusty lavender, if that's something you'd enjoy designing!",
      status: "waitlisted",
      priceUsd: 30,
      sentAt: at(-8, 14),
    },
    {
      id: "rq_full",
      artist: artist("mira"),
      service: service("svc_full").title,
      cover: asset(art.rainyRoad),
      character: wren,
      brief: "Wren on the road at dusk, the town she left behind glowing in the rain.",
      status: "delivered",
      step: "render",
      priceUsd: 160,
      sentAt: at(-40, 12),
      quotedAt: at(-38, 10),
      paidAt: at(-37, 9),
      dueAt: at(-5),
      deliveredAt: at(-6, 18),
      delivery: asset(art.rainyRoad),
    },
    {
      id: "rq_pixel",
      artist: artist("pebblecat"),
      service: "Pixel icon",
      cover: pool("12057737"),
      character: biscuit,
      brief: "Biscuit as a tiny pixel icon, tongue out.",
      status: "delivered",
      step: "render",
      priceUsd: 35,
      sentAt: at(-52, 15),
      quotedAt: at(-51, 10),
      paidAt: at(-50, 11),
      dueAt: at(-30),
      deliveredAt: at(-33, 20),
      delivery: pool("12057737"),
    },
    {
      id: "rq_mecha",
      artist: artist("nadiadraws"),
      service: "Custom piece",
      cover: pool("12287050"),
      brief: "A mecha version of Wren, full armor, launching from a hangar.",
      status: "declined",
      priceUsd: 0,
      sentAt: at(-15, 13),
      closedAt: at(-14, 9),
      artistNote: "Mechs aren't my thing, sorry! Kai loves hard-surface designs, try asking there.",
    },
    {
      id: "rq_emotes",
      artist: artist("pebblecat"),
      service: "Emote pack (3)",
      cover: pool("12178737"),
      character: biscuit,
      brief: "Three emotes of Biscuit: love, bonk and zoomies.",
      status: "expired",
      priceUsd: 45,
      sentAt: at(-21, 15),
      quotedAt: at(-19, 10),
      quoteExpiresAt: at(-16, 10),
      closedAt: at(-16, 10),
    },
  ];
}

/** Requests the viewer really sent through a commission dialog, newest first. */
export function sentRequests(handle: string): MyRequest[] {
  return db.requests
    .filter((r) => r.requesterHandle === handle)
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => {
      const offered = db.services.find((s) => s.id === r.serviceId);
      const extras = r.addons?.map(({ label, priceUsd }) => ({ label, priceUsd }));
      return {
        id: r.id,
        artist: artist(r.artistHandle),
        service: offered?.title ?? "Custom piece",
        cover: offered?.examples[0] && asset(offered.examples[0]),
        brief: r.description,
        status: "sent" as const,
        priceUsd: (offered?.priceFromUsd ?? 0) + (extras?.reduce((sum, extra) => sum + extra.priceUsd, 0) ?? 0),
        extras,
        sentAt: r.createdAt,
        real: true,
      };
    });
}
