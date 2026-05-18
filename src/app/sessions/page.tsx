import { fetchTable } from "@/lib/api";
import SessionsClient from "./SessionsClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const first = await fetchTable("zpm_sessions", { limit: 50, offset: 0 });
  return (
    <SessionsClient
      initial={first.rows as Array<Record<string, unknown>>}
      initialHasMore={first.has_more}
      totalCount={first.total_count}
    />
  );
}
