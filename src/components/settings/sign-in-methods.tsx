import { KeyRound } from "lucide-react";
import { connectProvider } from "@/app/(site)/settings/actions";
import { PROVIDER_ICONS } from "@/components/auth/provider-icons";
import { buttonClasses } from "@/components/ui/button";
import { PROVIDER_NAMES, PROVIDERS, type Provider } from "@/lib/auth/providers";
import type { SignInIdentity } from "@/lib/settings/account";
import { DisconnectButton } from "./disconnect-button";
import { SheetRow } from "./sheet";

/**
 * Every way into the account: email and password, then Google, Discord and
 * Twitch. Connecting goes through the provider and back; a provider that
 * isn't switched on in Supabase yet shows faded, like on the sign-in page.
 */
export function SignInMethods({
  identities,
  hasPassword,
  enabled,
}: {
  identities: SignInIdentity[];
  hasPassword: boolean;
  enabled: Provider[];
}) {
  const ways = identities.length + (hasPassword ? 1 : 0);
  return (
    <div>
      <SheetRow
        label={
          <span className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-ice text-ocean [&_svg]:size-4">
              <KeyRound aria-hidden />
            </span>
            Email and password
          </span>
        }
        action={<span className={`text-sm font-semibold ${hasPassword ? "text-mint-ink dark:text-mint" : "text-muted"}`}>{hasPassword ? "On" : "No password yet"}</span>}
      />
      {PROVIDERS.map((provider) => {
        const linked = identities.find((identity) => identity.provider === provider);
        const available = enabled.includes(provider);
        return (
          <SheetRow
            key={provider}
            label={
              <span className={`flex items-center gap-2.5 ${!linked && !available ? "opacity-55" : ""}`}>
                <span className="grid size-8 place-items-center rounded-full border border-border bg-surface [&_svg]:size-4">{PROVIDER_ICONS[provider]}</span>
                {PROVIDER_NAMES[provider]}
              </span>
            }
            action={
              linked ? (
                <DisconnectButton provider={provider} name={PROVIDER_NAMES[provider]} last={ways <= 1} />
              ) : available ? (
                <form action={connectProvider}>
                  <input type="hidden" name="provider" value={provider} />
                  <button type="submit" className={buttonClasses({ variant: "secondary", size: "sm" })}>
                    Connect
                  </button>
                </form>
              ) : (
                <span className="text-sm text-muted">Coming soon</span>
              )
            }
          >
            {linked ? (
              <span className="flex flex-wrap items-center gap-x-1.5">
                Connected as <span className="truncate font-medium text-ink/85">{linked.as}</span>
              </span>
            ) : (
              "Not connected"
            )}
          </SheetRow>
        );
      })}
    </div>
  );
}
