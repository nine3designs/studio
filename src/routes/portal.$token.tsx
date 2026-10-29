import { createFileRoute } from "@tanstack/react-router";
import { PortalView } from "@/components/portal/PortalView";

export const Route = createFileRoute("/portal/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your portal — Nine3 Designs" },
      { name: "description", content: "Review designs, share files and see invoices with Nine3 Designs." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Your portal — Nine3 Designs" },
      { property: "og:description", content: "Review designs, share files and see invoices with Nine3 Designs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TokenPortal,
});

function TokenPortal() {
  const { token } = Route.useParams();
  return <PortalView token={token} />;
}
