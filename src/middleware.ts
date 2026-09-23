import { NextRequest, NextResponse } from "next/server";

const ROLES = ["superadmin", "admin", "student", "teacher", "telecaller"];

interface TokenClaims {
  role: string | null;
  instituteSlug: string | null;
}

function decodeToken(token: string): TokenClaims {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const data = JSON.parse(json);
    return {
      role: typeof data.role === "string" ? data.role : null,
      instituteSlug: typeof data.instituteSlug === "string" ? data.instituteSlug : null,
    };
  } catch {
    return { role: null, instituteSlug: null };
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;
  const { role, instituteSlug: tokenSlug } = token ? decodeToken(token) : { role: null, instituteSlug: null };

  const segments = pathname.split("/").filter(Boolean);

  // /student-portfolio/... is a top-level platform feature (its own public
  // create/login/dashboard/[slug] pages, auth'd via a separate cookie) —
  // never an institute slug, so it must never enter the institute routing
  // below (it would otherwise look like /<slug>/login or /<slug>/dashboard).
  if (segments[0] === "student-portfolio") {
    return NextResponse.next();
  }

  // Institute-scoped routes look like /<slug>/dashboard/..., /<slug>/login, /<slug>/signup.
  const kind = segments[1];
  const isInstituteScoped = segments.length >= 2 && (kind === "dashboard" || kind === "login" || kind === "signup");

  if (isInstituteScoped) {
    const urlSlug = segments[0];

    if (kind === "dashboard") {
      if (!role) {
        return NextResponse.redirect(new URL(`/${urlSlug}/login`, req.url));
      }
      // Logged in under a different institute than the one in the URL —
      // send them back to their own instead of leaking this one's shell.
      // superadmin is exempt: it isn't tied to any one institute and — like
      // the original role-segment check below — is allowed to view any
      // tenant's dashboard shell.
      if (role !== "superadmin" && tokenSlug && tokenSlug !== urlSlug) {
        return NextResponse.redirect(new URL(`/${tokenSlug}/dashboard/${role}`, req.url));
      }

      const roleSegment = segments[2];
      if (!roleSegment) {
        return NextResponse.redirect(new URL(`/${urlSlug}/dashboard/${role}`, req.url));
      }
      if (role !== "superadmin" && ROLES.includes(roleSegment) && roleSegment !== role) {
        return NextResponse.redirect(new URL(`/${urlSlug}/dashboard/${role}`, req.url));
      }
    } else if (role) {
      // Already signed in and hitting /<slug>/login or /<slug>/signup.
      return NextResponse.redirect(new URL(`/${tokenSlug || urlSlug}/dashboard/${role}`, req.url));
    }

    return NextResponse.next();
  }

  // Generic, non-institute-scoped entry points (/, /login, /signup) — if
  // already signed in, send straight to their own institute's dashboard.
  if ((pathname === "/login" || pathname === "/signup") && role && tokenSlug) {
    return NextResponse.redirect(new URL(`/${tokenSlug}/dashboard/${role}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
