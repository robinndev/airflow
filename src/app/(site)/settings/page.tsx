import type { Metadata } from "next";
import { Suspense } from "react";
import { EmailSetting } from "@/components/settings/email-setting";
import { PasswordSetting } from "@/components/settings/password-setting";
import { SessionsList } from "@/components/settings/sessions-list";
import { SettingsSheet, SheetFallback, SheetNotice, SheetSection, SignInSheet } from "@/components/settings/sheet";
import { SignInMethods } from "@/components/settings/sign-in-methods";
import { enabledProviders } from "@/lib/auth/enabled-providers";
import { PROVIDER_NAMES, PROVIDERS, type Provider } from "@/lib/auth/providers";
import { getAccountDetails } from "@/lib/settings/server";

export const metadata: Metadata = {
  title: "Settings",
  description: "Your email, password, the accounts you sign in with, and where you're signed in.",
};

const TITLE = "Account";

export default function AccountSettingsPage({ searchParams }: PageProps<"/settings">) {
  return (
    <Suspense fallback={<SheetFallback title={TITLE} />}>
      <Account searchParams={searchParams} />
    </Suspense>
  );
}

/** What a link or a provider sent back (`?email=`, `?linked=`, `?auth_error=`). */
function outcomeOf(params: Record<string, string | string[] | undefined>) {
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  const linked = one("linked");
  const error = one("auth_error");
  if (error === "identity_already_exists") {
    return { tone: "problem" as const, text: "That account is already connected to another Artiflow account. Disconnect it there first." };
  }
  if (error === "linking_off") {
    return { tone: "problem" as const, text: "Connecting accounts isn't switched on yet. Try again soon." };
  }
  if (error) return { tone: "problem" as const, text: "That link didn't work, or it expired. Try again from here." };
  if (one("email") === "half") return { tone: "ok" as const, text: "One link down: now open the one we sent to the other address." };
  if (one("email") === "changed") return { tone: "ok" as const, text: "Your email is changed." };
  if (linked && PROVIDERS.includes(linked as Provider)) {
    return { tone: "ok" as const, text: `${PROVIDER_NAMES[linked as Provider]} is connected. You can sign in with it now.` };
  }
  return null;
}

async function Account({ searchParams }: Pick<PageProps<"/settings">, "searchParams">) {
  const [account, enabled, params] = await Promise.all([getAccountDetails(), enabledProviders(), searchParams]);
  if (!account) {
    return (
      <SignInSheet title={TITLE} next="/settings">
        Your email, your password, the accounts you sign in with and where you&apos;re signed in.
      </SignInSheet>
    );
  }
  const outcome = outcomeOf(params);

  return (
    <SettingsSheet title={TITLE} aside="only you see this page">
      {outcome && <SheetNotice tone={outcome.tone}>{outcome.text}</SheetNotice>}

      <SheetSection id="email" title="Email" description="Where links to confirm or reset things go. Never shown on your profile.">
        <EmailSetting email={account.email} pending={account.pendingEmail} />
      </SheetSection>

      <SheetSection id="password" title="Password">
        <PasswordSetting hasPassword={account.hasPassword} />
      </SheetSection>

      <SheetSection
        id="sign-in"
        title="Ways to sign in"
        description="Connect the accounts you already use, and sign in with whichever is at hand. Keep at least one."
      >
        <SignInMethods identities={account.identities} hasPassword={account.hasPassword} enabled={enabled} />
      </SheetSection>

      <SheetSection id="sessions" title="Where you're signed in" description="Every browser and device with your account open right now.">
        <SessionsList initial={account.sessions} />
      </SheetSection>
    </SettingsSheet>
  );
}
