import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const sb = await getSupabaseServer();
  await sb?.auth.signOut();
  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
