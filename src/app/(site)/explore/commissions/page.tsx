import { redirect } from "next/navigation";

/** Open commissions are a search: every service taking requests now. */
export default function OpenCommissionsPage(): never {
  redirect("/explore/search");
}
