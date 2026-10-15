import { itemOf } from "@/lib/shop/catalog";

/*
 * Enamel pins from the shop, worn beside the display name: a gold rim, a
 * flat enamel fill and a shine, drawn on a 32-unit box. The holo star's
 * enamel shifts like foil (still with reduced motion).
 */

const GOLD = "#d9a441";
const INK = "#3a2a14";

function Art({ id }: { id: string }) {
  switch (id) {
    case "brush":
      return (
        <>
          <path d="M22.5 4.5 27.5 9.5 14 23 9 18z" fill="#7cc6ff" stroke={GOLD} strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 18 14 23c-1 4-5 6-9.5 5.5C5 24 6 20 9 18z" fill="#ff6f9c" stroke={GOLD} strokeWidth="2" strokeLinejoin="round" />
          <path d="M20 7l5 5" stroke="#fff" strokeOpacity=".6" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );
    case "owl":
      return (
        <>
          <path d="M6 9 9 4l4 3h6l4-3 3 5v12c0 5-4 8-10 8S6 26 6 21z" fill="#8f7cf6" stroke={GOLD} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="12" cy="14" r="3.6" fill="#fff4c4" stroke={GOLD} strokeWidth="1.4" />
          <circle cx="20" cy="14" r="3.6" fill="#fff4c4" stroke={GOLD} strokeWidth="1.4" />
          <circle cx="12" cy="14" r="1.5" fill={INK} />
          <circle cx="20" cy="14" r="1.5" fill={INK} />
          <path d="M16 17l-1.5 2.4h3z" fill="#ffb347" />
        </>
      );
    case "coffee":
      return (
        <>
          <path d="M7 12h16v8c0 4-3 7-8 7s-8-3-8-7z" fill="#fff7ec" stroke={GOLD} strokeWidth="2" strokeLinejoin="round" />
          <path d="M23 14h2.5a3 3 0 0 1 0 6H23" fill="none" stroke={GOLD} strokeWidth="2" />
          <path d="M8.5 14.5h13" stroke="#8a5a3c" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M12 4c-1.5 2 1.5 3 0 5M17 4c-1.5 2 1.5 3 0 5" stroke="#b9c7d6" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </>
      );
    case "oc":
      return (
        <>
          <path d="M16 28C7 22 3 17 3 11.5A6.5 6.5 0 0 1 16 8a6.5 6.5 0 0 1 13 3.5C29 17 25 22 16 28z" fill="#ff7aa8" stroke={GOLD} strokeWidth="2" strokeLinejoin="round" />
          <text x="16" y="18.5" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="8.5" fill="#fff">
            OC
          </text>
        </>
      );
    case "holo-star":
      return (
        <>
          <defs>
            <clipPath id="pin-holo-star">
              <path d="M16 2.5l3.9 8 8.6 1.2-6.3 6 1.5 8.6L16 22.2l-7.7 4.1 1.5-8.6-6.3-6 8.6-1.2z" />
            </clipPath>
          </defs>
          <foreignObject x="0" y="0" width="32" height="32" clipPath="url(#pin-holo-star)">
            <div className="pin-holo size-full" />
          </foreignObject>
          <path d="M16 2.5l3.9 8 8.6 1.2-6.3 6 1.5 8.6L16 22.2l-7.7 4.1 1.5-8.6-6.3-6 8.6-1.2z" fill="none" stroke={GOLD} strokeWidth="2" strokeLinejoin="round" />
        </>
      );
    default:
      return null;
  }
}

/** A pin at `size` px. Beside a name it carries its own label for screen readers. */
export function Pin({ id, size = 24, labelled = false, className = "" }: { id: string | null | undefined; size?: number; labelled?: boolean; className?: string }) {
  const item = itemOf("pin", id);
  if (!item) return null;
  return (
    <span data-part="pin" title={labelled ? `Pin: ${item.name}` : undefined} className={`inline-grid shrink-0 place-items-center ${className}`}>
      <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden className="overflow-visible drop-shadow-[0_1.5px_1px_rgb(0_0_0/0.25)]">
        <Art id={item.id} />
        {/* the shine every enamel pin has */}
        <path d="M9 6.5c2-1.6 4.4-2.2 6.5-2" stroke="#fff" strokeOpacity=".7" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
      {labelled && <span className="sr-only">Pin: {item.name}</span>}
    </span>
  );
}
