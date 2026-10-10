// Each page renders its own <SiteHeader /> so profiles can float it over the banner.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <div className="flex min-h-full flex-1 flex-col bg-canvas">{children}</div>;
}
