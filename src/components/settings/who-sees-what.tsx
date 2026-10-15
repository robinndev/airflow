import type { ReactNode } from "react";
import { Globe, LockKeyhole } from "lucide-react";

/*
 * What's public on Artiflow and what only you (and whoever you deal with)
 * can see: how the system already works, written down so nobody has to
 * guess. Keep it in step with the database's rules (row level security).
 */

const PUBLIC = [
  "Your profile: name, handle, bio, links, and pronouns, location and local time if you add them",
  "Your posts, gallery, characters, collections and listings",
  "Who you follow, and who follows you",
  "How many likes a post has",
  "Whether you're an artist or a collector",
];

const PRIVATE = [
  "What you like: artists see how many, never who",
  "Your favorites and your moodboard",
  "Your messages, between you and the person you write to",
  "Your commission requests and orders, between you and the artist",
  "Your email, how you sign in, and these settings",
];

export function WhoSeesWhat() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Pocket icon={<Globe aria-hidden />} title="Anyone, even signed out" items={PUBLIC} tone="bg-sky/10 text-sky-ink dark:text-sky" />
      <Pocket icon={<LockKeyhole aria-hidden />} title="Only you" items={PRIVATE} tone="bg-lilac/12 text-lilac-ink dark:text-lilac" />
    </div>
  );
}

function Pocket({ icon, title, items, tone }: { icon: ReactNode; title: string; items: string[]; tone: string }) {
  return (
    <section className="rounded-card border border-border bg-canvas/40 p-4">
      <h4 className="flex items-center gap-2 text-sm font-bold text-ink">
        <span className={`grid size-7 place-items-center rounded-full [&_svg]:size-3.5 ${tone}`}>{icon}</span>
        {title}
      </h4>
      <ul className="mt-3 grid gap-2 text-sm leading-snug text-ink/80">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-border" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
