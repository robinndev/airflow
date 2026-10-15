import { cacheLife, cacheTag } from "next/cache";
import { profileTag } from "@/lib/profile/queries";
import type { FollowList, FollowPage } from "./list";
import { fetchFollowList } from "./server";

/**
 * The first page of someone's followers or following, the same for every
 * viewer. A follow invalidates both people's profile tags (`setFollow`), which
 * covers both lists it changes; names and pictures on the cards catch up
 * within minutes.
 */
export async function getFollowList(handle: string, list: FollowList): Promise<FollowPage> {
  "use cache";
  cacheLife("minutes");
  cacheTag(profileTag(handle));

  return fetchFollowList(handle, list);
}
