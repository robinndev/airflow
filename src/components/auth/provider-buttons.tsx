import { continueWithProvider } from "@/app/(auth)/actions";
import { PROVIDER_NAMES, PROVIDERS, type Provider } from "@/lib/auth/providers";
import { PROVIDER_ICONS } from "./provider-icons";

const button =
  "inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-button border border-border bg-surface px-1.5 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-sky/60 hover:bg-ice/60 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-surface sm:gap-2 sm:px-2 sm:text-sm [&_svg]:size-4 [&_svg]:shrink-0 sm:[&_svg]:size-[1.125rem]";

/**
 * Google, Discord and Twitch, always shown. One that isn't switched on in
 * Supabase yet stays visible but faded and disabled ("coming soon").
 */
export function ProviderButtons({ verb, enabled }: { verb: "Sign in" | "Sign up"; enabled: Provider[] }) {
  return (
    <form action={continueWithProvider} className="mt-7 grid grid-cols-3 gap-2">
      {PROVIDERS.map((provider) => {
        const on = enabled.includes(provider);
        const name = PROVIDER_NAMES[provider];
        return (
          <button
            key={provider}
            type="submit"
            name="provider"
            value={provider}
            disabled={!on}
            title={on ? undefined : `${name} sign-in is coming soon`}
            aria-label={on ? `${verb} with ${name}` : `${verb} with ${name} (coming soon)`}
            className={button}
          >
            {PROVIDER_ICONS[provider]}
            <span className="truncate">{name}</span>
          </button>
        );
      })}
    </form>
  );
}
