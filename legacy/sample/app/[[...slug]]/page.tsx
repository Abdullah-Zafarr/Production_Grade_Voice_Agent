// This file is a Server Component that wraps the client-side app.
// generateStaticParams is required for dynamic routes with output: "export"
import ClientApp from "./client";

// Pre-generate all admin routes as static pages
export async function generateStaticParams() {
  return [
    { slug: [] },            // /admin/
    { slug: ["login"] },     // /admin/login
    { slug: ["calls"] },     // /admin/calls
    { slug: ["agent"] },     // /admin/agent
    { slug: ["knowledge"] }, // /admin/knowledge
    { slug: ["embed"] },     // /admin/embed
    { slug: ["integrations"] }, // /admin/integrations
    { slug: ["analytics"] }, // /admin/analytics
    { slug: ["team"] },      // /admin/team
    { slug: ["settings"] },  // /admin/settings
  ];
}

export default function Page() {
  return <ClientApp />;
}
