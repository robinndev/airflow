import { expect } from "@playwright/test";
import { localSupabase } from "./local-supabase";

type MailpitSearch = { messages: { ID: string; Subject: string }[] };
type MailpitMessage = { Subject: string; Text: string };

/** Waits for the newest email sent to `to` and returns it. */
export async function latestEmailTo(to: string): Promise<MailpitMessage> {
  const { mailpitUrl } = localSupabase();
  const query = encodeURIComponent(`to:"${to}"`);
  let id: string | undefined;

  await expect
    .poll(
      async () => {
        const res = await fetch(`${mailpitUrl}/api/v1/search?query=${query}`);
        const body = (await res.json()) as MailpitSearch;
        id = body.messages[0]?.ID;
        return id;
      },
      { message: `No email arrived for ${to}`, timeout: 15_000 },
    )
    .toBeTruthy();

  const res = await fetch(`${mailpitUrl}/api/v1/message/${id}`);
  return (await res.json()) as MailpitMessage;
}

/** The Supabase verify link inside an auth email (confirm sign-up, reset password…). */
export function verifyLink(email: MailpitMessage) {
  const link = email.Text.match(/https?:\/\/\S+\/auth\/v1\/verify\?\S+/)?.[0];
  if (!link) throw new Error(`No verify link in "${email.Subject}":\n${email.Text}`);
  return link;
}
