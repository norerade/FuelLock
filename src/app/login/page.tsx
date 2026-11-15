import { redirect } from "next/navigation";
import DemoLogin from "@/components/demo-login";
import { Brand } from "@/components/ui";
import { identity } from "@/server/session";
import { loginDestination } from "@/server/workspace-paths";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const destination = loginDestination((await searchParams).next);
  if (await identity()) redirect(destination);
  return (
    <main className="entry-card">
      <Brand href="/" />
      <h1>Open your workspace</h1>
      <p>
        Start a private demo household, or use your invitation link to join an
        existing household.
      </p>
      <DemoLogin next={destination} />
    </main>
  );
}
