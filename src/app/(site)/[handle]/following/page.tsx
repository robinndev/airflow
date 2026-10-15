import { FollowListPage } from "@/components/follows/follow-list-page";

export const metadata = { title: "Following" };

export default function FollowingPage({ params }: PageProps<"/[handle]/following">) {
  return <FollowListPage params={params} list="following" />;
}
