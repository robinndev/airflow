import { redirect } from "next/navigation";

/** The newest listings first. */
export default function RecentPage(): never {
  redirect("/explore/search?sort=recent&avail=waitlist");
}
