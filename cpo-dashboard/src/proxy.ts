import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * HTTP Basic auth over the whole dashboard.
 *
 * The Vercel hobby plan has no Deployment Protection, and this page serves
 * freight costs and invoice values — so the app guards itself. Credentials come
 * from env vars; there is no fallback, so a missing/blank password locks
 * everyone out rather than silently serving the data to the internet.
 */
function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Logistics CPO Tracker", charset="UTF-8"',
      // Never let a proxy or browser cache a protected response.
      "Cache-Control": "no-store",
    },
  });
}

/** Length-independent comparison, so response time doesn't leak the secret. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function proxy(request: NextRequest) {
  const expectedUser = process.env.DASHBOARD_USER;
  const expectedPassword = process.env.DASHBOARD_PASSWORD;

  // Fail closed: without configured credentials nothing is served.
  if (!expectedUser || !expectedPassword) return unauthorized();

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return unauthorized();

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }

  const separator = decoded.indexOf(":");
  if (separator < 0) return unauthorized();

  const user = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);

  // Evaluate both so a wrong username and a wrong password cost the same.
  const userOk = safeEqual(user, expectedUser);
  const passwordOk = safeEqual(password, expectedPassword);
  if (!userOk || !passwordOk) return unauthorized();

  return NextResponse.next();
}

export const config = {
  // Everything except Next's own static assets, the favicon and the company
  // logo — notably this DOES cover /api/cpo, where the cost figures are served.
  //
  // Public assets are named individually rather than excluded by extension:
  // the default stays "protected", so adding a file can't accidentally widen
  // what's readable without a password.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|esc-plan-logo.png).*)"],
};
