export function getAvatarSrc(avatar: string | null) {
  if (!avatar) return '/default-avatar.png';
  // If it already starts with http(s), return as-is
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
  return `/storage/${avatar}`;
}
