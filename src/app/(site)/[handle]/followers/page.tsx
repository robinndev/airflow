import { FollowListPage } from "@/components/follows/follow-list-page";

export const metadata = { title: "Followers" };

export default function FollowersPage({ params }: PageProps<"/[handle]/followers">) {
  return <FollowListPage params={params} list="followers" />;
}
