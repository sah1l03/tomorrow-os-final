import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(
        new URL("/dashboard", request.url)
      );

      response.headers.set("Cache-Control", "private, no-store");

      return response;
    }
  }

  return new NextResponse(
    "This confirmation link is invalid or expired. Return to TomorrowOS and try signing up again.",
    {
      status: 400,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    }
  );
}