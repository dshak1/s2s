import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/profile";
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(`${origin}/profile?account_error=${encodeURIComponent(errorDescription)}`);
  }

  const supabase = await getSupabaseServer();
  if (!supabase || !code) {
    return NextResponse.redirect(`${origin}/profile?account_error=missing-code`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/profile?account_error=${encodeURIComponent(error.message)}`);
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/profile";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
