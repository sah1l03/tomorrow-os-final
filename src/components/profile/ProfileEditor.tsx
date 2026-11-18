"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/planner/ui";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { prepareProfilePhoto } from "@/components/profile/profile-photo";
import { avatarPath, avatarUrl, profileInitials, profilePhotoBucket, profilePhotoLimit, usernamePattern, type Profile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";

type PhotoEdit = { kind: "keep" | "remove" } | { kind: "replace"; blob: Blob; preview: string };

export default function ProfileEditor({ initial, email, userId }: { initial: Profile; email: string; userId: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [username, setUsername] = useState(initial.username ?? "");
  const [photoEdit, setPhotoEdit] = useState<PhotoEdit>({ kind: "keep" });
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const photoHelp = useId();
  const selection = useRef(0);
  const avatar = photoEdit.kind === "replace" ? photoEdit.preview : photoEdit.kind === "remove" ? null : avatarUrl(saved.avatar_id);
  const preview = photoEdit.kind === "replace" ? photoEdit.preview : null;
  const dirty = username.trim() !== (saved.username ?? "") || photoEdit.kind !== "keep";

  useEffect(() => () => { selection.current++; }, []);
  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const request = ++selection.current;
    setPreparing(true);
    setError("");
    setNotice("");
    try {
      const blob = await prepareProfilePhoto(file);
      if (blob.type !== "image/jpeg" || blob.size > profilePhotoLimit) {
        throw new Error("Could not resize this photo. Try another file.");
      }
      if (request === selection.current) setPhotoEdit({ kind: "replace", blob, preview: URL.createObjectURL(blob) });
    } catch (error) {
      if (request === selection.current) setError(error instanceof Error ? error.message : "Could not open this photo.");
    } finally {
      if (request === selection.current) setPreparing(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextUsername = username.trim();
    if (nextUsername && !usernamePattern.test(nextUsername)) {
      setError("Use 3–24 letters, numbers, periods, underscores, or hyphens, starting with a letter or number.");
      setNotice("");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const client = createClient();
      const photos = client.storage.from(profilePhotoBucket);
      let newPhotoId: string | null = null;
      if (photoEdit.kind === "replace") {
        newPhotoId = crypto.randomUUID();
        const { error: uploadError } = await photos.upload(avatarPath(userId, newPhotoId), photoEdit.blob,
          { contentType: "image/jpeg", cacheControl: "0" });
        if (uploadError) throw new Error("Could not upload your photo. Try again.");
      }

      const { data, error: saveError } = await client.from("profiles").upsert({
        user_id: userId, username: nextUsername || null,
        ...(photoEdit.kind !== "keep" ? { avatar_id: newPhotoId } : {}),
      }, { onConflict: "user_id" }).select("username, avatar_id").single();
      if (saveError || !data) {
        // Keep a newly uploaded photo if the server's save outcome is uncertain.
        if (newPhotoId && saveError && ["23505", "23514", "42501"].includes(saveError.code)) {
          void photos.remove([avatarPath(userId, newPhotoId)]).catch(() => {});
        }
        throw new Error(saveError?.code === "23505" ? "That username is already taken." : "Could not save your profile. Try again.");
      }

      const updated = data as Profile;
      if (photoEdit.kind !== "keep" && saved.avatar_id && saved.avatar_id !== updated.avatar_id) {
        void photos.remove([avatarPath(userId, saved.avatar_id)]).catch(() => {});
      }
      setSaved(updated);
      setUsername(updated.username ?? "");
      setPhotoEdit({ kind: "keep" });
      setNotice("Profile saved.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel max-w-xl">
      <fieldset disabled={saving || preparing} className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <ProfileAvatar large src={avatar} initials={profileInitials(username.trim() || saved.username, email)} />
          <div className="min-w-0 space-y-2">
            <h2 className="font-semibold">Profile picture</h2>
            <div className="flex flex-wrap items-center gap-2">
              <input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                aria-label="Profile photo" onChange={choosePhoto} />
              <button type="button" className="button-secondary" aria-describedby={photoHelp} onClick={() => input.current?.click()}>
                {preparing ? "Opening photo…" : avatar ? "Change photo" : "Choose photo"}
              </button>
              {avatar && <button type="button" className="button-quiet text-rose-700" onClick={() => {
                setPhotoEdit({ kind: saved.avatar_id ? "remove" : "keep" });
                setError("");
                setNotice("");
              }}>Remove photo</button>}
              {photoEdit.kind === "remove" && (
                <button type="button" className="button-quiet text-brand-800" onClick={() => setPhotoEdit({ kind: "keep" })}>Undo removal</button>
              )}
            </div>
            <p className="text-xs text-slate-600" id={photoHelp}>
              {photoEdit.kind === "remove" ? "Save to remove your picture." : "JPG, PNG, or WebP up to 8 MB."}
            </p>
          </div>
        </div>
        <Field label="Username" help="Use 3–24 characters. Start with a letter or number.">
          <input className="control" name="username" maxLength={24} autoComplete="username" autoCapitalize="none" spellCheck={false}
            placeholder="Choose a username" value={username} onChange={event => {
              setUsername(event.target.value);
              setError("");
              setNotice("");
            }} />
        </Field>
        {email && <div className="rounded-lg border border-slate-200 bg-slate-50/75 px-3 py-2.5">
          <p className="text-xs font-semibold text-slate-600">Sign-in email</p>
          <p className="mt-1 wrap-anywhere text-sm">{email}</p>
        </div>}
        <button type="submit" className="button-primary" disabled={!dirty || saving || preparing}>
          {saving ? "Saving…" : "Save profile"}
        </button>
        {error && <p className="feedback-error" role="alert">{error}</p>}
        {!error && notice && <p className="feedback-ok" role="status">{notice}</p>}
      </fieldset>
    </form>
  );
}
