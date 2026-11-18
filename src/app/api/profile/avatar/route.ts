import { avatarPath, photoIdPattern, profilePhotoBucket, profilePhotoLimit } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

const headers = {
  "Cache-Control": "private, no-store",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("v");
  if (!id || !photoIdPattern.test(id)) return new Response(null, { status: 404, headers });

  const supabase = await createClient();
  const { data: session, error: authError } = await supabase.auth.getClaims();
  const userId = session?.claims?.sub;
  if (authError || !userId) return new Response(null, { status: 401, headers });

  const { data: profile } = await supabase.from("profiles").select("avatar_id").eq("user_id", userId).maybeSingle();
  if (profile?.avatar_id !== id) return new Response(null, { status: 404, headers });

  const { data: photo, error } = await supabase.storage.from(profilePhotoBucket)
    .download(avatarPath(userId, id), {}, { cache: "no-store" });
  if (error || !photo || photo.size > profilePhotoLimit || photo.type !== "image/jpeg") {
    return new Response(null, { status: 404, headers });
  }

  return new Response(photo, { headers: { ...headers, "Content-Type": "image/jpeg" } });
}
