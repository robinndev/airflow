import { redirect } from "next/navigation";

/** Adoptables are a search: every ready-made character still available. */
export default function AdoptablesPage(): never {
  redirect("/explore/search?type=adoptables");
}
