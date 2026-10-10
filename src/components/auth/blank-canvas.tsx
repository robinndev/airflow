"use client";

import Image from "next/image";
import { useEffect } from "react";
import { HandNote, Scribble, Sparkle, Tape } from "@/components/explore/doodles";
import { Stamp } from "@/components/explore/stamp";
import type { Invite } from "@/lib/auth/invites";
import { ConstructionSketch, Pencil } from "./desk-props";
import { useDesk } from "./desk";
import { lightDesk } from "./light";

/**
 * Sign-up's side of the desk: a primed canvas with the first construction
 * lines of a piece. It signs itself with the handle being typed, pins the
 * inviter's polaroid once their code checks out (and takes their light), and
 * gets stamped when the account is made.
 */
export function BlankCanvas() {
  const { handle, invite, signed } = useDesk();

  useEffect(() => {
    lightDesk(invite?.glow ?? null);
  }, [invite]);

  return (
    <section aria-label="Your canvas" className="relative mx-auto w-full max-w-[430px]">
      <HandNote tone="ocean" className="absolute -top-16 left-6 -rotate-3 text-[1.5rem]">
        {signed ? "signed, sealed, yours ✦" : "pick a handle, it signs itself ↘"}
      </HandNote>
      <Sparkle className="absolute top-[30%] -left-10 size-4 text-mint" />
      <Sparkle className="absolute -right-9 bottom-[38%] size-3 text-lilac" />

      <div
        className="canvas-weave relative aspect-[4/5] w-full -rotate-[1.5deg] rounded-[3px]"
        style={{
          boxShadow:
            "5px 6px 0 color-mix(in oklab, var(--paper) 82%, var(--paper-muted)), var(--shadow-lift-v)",
        }}
      >
        <Tape tone="sky" className="-top-3 -left-6 w-20 -rotate-[32deg]" />
        <Tape tone="lilac" className="-top-3 -right-6 w-20 rotate-[32deg]" />
        <ConstructionSketch className="absolute inset-[7%] text-paper-muted" />
        <p className="absolute top-[3.5%] left-[6%] -rotate-2 font-hand text-lg text-paper-muted/80">
          untitled — your first piece
        </p>

        <span className="absolute right-[7%] bottom-[4.5%] flex max-w-[64%] justify-end">
          {handle ? (
            <span key="signed" className="relative block -rotate-6 truncate pb-2 font-hand text-[2.6rem] leading-[1.1] font-bold text-ocean">
              {handle}
              <Scribble className="absolute right-0 -bottom-1 w-[min(100%,9rem)] text-ocean/60" />
            </span>
          ) : (
            <span className="flex items-end gap-1.5 font-hand text-2xl leading-none text-paper-muted/70">
              ✕<span className="mb-0.5 inline-block w-32 border-b-2 border-dashed border-paper-muted/40" />
            </span>
          )}
        </span>

        {signed && (
          <span className="absolute inset-x-0 top-[40%] grid place-items-center">
            <Stamp tone="mint" className="animate-stamp -rotate-12 bg-paper/80 px-3 py-1.5 text-sm">
              Welcome to the studio
            </Stamp>
          </span>
        )}
      </div>

      {invite && <InviterNote invite={invite} />}
      <Pencil className="absolute -right-14 -bottom-10 z-10 w-[72%] rotate-[192deg]" />
    </section>
  );
}

function InviterNote({ invite }: { invite: Invite }) {
  const { inviter } = invite;
  return (
    <>
      <figure className="absolute -top-8 -right-12 z-20 m-0 w-[38%] rotate-[7deg] animate-stamp rounded-[3px] bg-paper p-2 pb-10 shadow-lift">
        <Tape tone="mint" className="-top-3 left-1/2 w-16 -translate-x-1/2 rotate-3" />
        <span className="relative block aspect-square overflow-hidden rounded-[2px] bg-ice">
          <Image
            src={inviter.avatar.src}
            alt=""
            fill
            sizes="160px"
            className="object-cover"
            style={{ objectPosition: inviter.avatar.focus }}
          />
        </span>
        <figcaption className="absolute inset-x-2 bottom-2 truncate text-center font-hand text-xl leading-none text-on-paper">
          @{inviter.handle} ♥
        </figcaption>
      </figure>
      <p
        className="absolute -bottom-6 -left-10 z-20 w-[48%] -rotate-[4deg] animate-stamp p-3.5 pb-4 font-hand text-[1.3rem] leading-[1.1] text-on-paper shadow-lift [animation-delay:120ms]"
        style={{ backgroundColor: "color-mix(in oklab, var(--star) 34%, var(--paper))" }}
      >
        “{invite.note}”
        <span className="mt-1 block text-right text-paper-muted">— {inviter.displayName.split(" ")[0]}</span>
      </p>
    </>
  );
}
