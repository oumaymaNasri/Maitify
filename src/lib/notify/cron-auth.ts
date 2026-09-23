/** Autorise le cron Vercel et les appels manuels protégés par CRON_SECRET. */
export function authorizeCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  const query = new URL(req.url).searchParams.get("secret");
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";

  if (secret) {
    return bearer === secret || query === secret;
  }

  return isVercelCron || process.env.NODE_ENV !== "production";
}
