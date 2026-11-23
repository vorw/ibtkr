import { siteSettings } from "./site-settings";
import { maintenanceHtml } from "./maintenance-page";

// The Worker checks this before the application, API or scheduled job.
export function isMaintenanceActive(): boolean {
  return siteSettings.maintenance.enabled;
}

const maintenanceAssets = new Set([
  "/assets/ftc-logo.svg",
  "/favicon.svg",
  "/fonts/plex-arabic-regular.woff2",
  "/fonts/plex-arabic-medium.woff2",
]);

export function maintenanceResponse(request: Request): Response | null {
  if (!isMaintenanceActive()) return null;
  const path = new URL(request.url).pathname;
  if (
    (request.method === "GET" || request.method === "HEAD") &&
    maintenanceAssets.has(path)
  )
    return null;
  const headers = {
    "Cache-Control": "no-store, max-age=0",
    // Suggested retry interval, not a promised reopening time.
    "Retry-After": "3600",
    "X-Content-Type-Options": "nosniff",
  };
  if (
    path === "/api" ||
    path.startsWith("/api/") ||
    !["GET", "HEAD"].includes(request.method)
  ) {
    return new Response(
      request.method === "HEAD"
        ? null
        : JSON.stringify({
            error:
              "ابتكر متوقف مؤقتًا للصيانة والتحسين. مشاركاتكم ونتائجكم محفوظة.",
            code: "maintenance",
          }),
      {
        status: 503,
        headers: {
          ...headers,
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  }
  return new Response(request.method === "HEAD" ? null : maintenanceHtml, {
    status: 503,
    headers: {
      ...headers,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  });
}
