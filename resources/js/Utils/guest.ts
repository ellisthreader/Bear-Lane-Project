// guest.ts
export function getGuestId() {
  let guestId = localStorage.getItem('guest_id');
  if (!guestId) {
    guestId = crypto.randomUUID(); // generates a unique ID
    localStorage.setItem('guest_id', guestId);
  }
  return guestId;
}
