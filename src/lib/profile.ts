export type Profile = { username: string | null; avatar_id: string | null };

export const emptyProfile: Profile = { username: null, avatar_id: null };
export const profilePhotoBucket = "tomorrow-profile-photos";
export const profilePhotoLimit = 512 * 1024;
export const usernamePattern = /^[A-Za-z0-9][A-Za-z0-9_.-]{2,23}$/;
export const photoIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function avatarPath(userId: string, id: string) {
  return `${userId}/${id}.jpg`;
}

export function avatarUrl(id: string | null) {
  return id ? "/api/profile/avatar?v=" + id : null;
}

export function profileInitials(username: string | null, email: string) {
  const label = username || email.split("@")[0];
  const words = label.split(/[_.-]+/).filter(Boolean);
  const initials = words.length > 1 ? words[0][0] + words[1][0] : label.slice(0, 2);
  return initials.toUpperCase() || "?";
}
