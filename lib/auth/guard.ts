import "server-only";
import { redirect } from "next/navigation";
import { getAdminSession } from "./session";
import type { AdminSessionPayload } from "./token";

/** Use in admin Server Components/pages. Redirects to login if unauthenticated. */
export async function requireAdminPage(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

/** Use in admin API route handlers. Returns null (never redirects) so the caller can return 401. */
export async function requireAdminApi(): Promise<AdminSessionPayload | null> {
  return getAdminSession();
}
