import type { ReactNode } from "react";
import { DiscordIcon, GoogleIcon, SocialIcon } from "@/components/icons/social-icon";
import type { Provider } from "@/lib/auth/providers";

export const PROVIDER_ICONS: Record<Provider, ReactNode> = {
  google: <GoogleIcon />,
  discord: <DiscordIcon />,
  twitch: <SocialIcon platform="twitch" />,
};
