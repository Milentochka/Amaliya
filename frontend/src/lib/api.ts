const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type RsvpStatus = "coming" | "not_coming" | "maybe";

export interface RegisterPayload {
  name: string;
  birth_date: string; // DD/MM/YY
  gender: "M" | "F";
  rsvp_christening: RsvpStatus;
  rsvp_banquet: RsvpStatus;
}

export interface AvatarOut {
  id: number;
  name: string;
  image_url: string;
}

export interface GuestOut {
  id: string;
  name: string;
  birth_date: string;
  gender: "M" | "F";
  avatar: AvatarOut;
  zodiac: string;
  chinese_zodiac: string;
  has_telegram: boolean;
}

export interface RegisterResponse {
  guest: GuestOut;
  rsvp: { christening: RsvpStatus; banquet: RsvpStatus };
}

export interface ApiError {
  detail: string | { msg: string }[];
}

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as ApiError;
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.detail) && j.detail[0]?.msg) return j.detail[0].msg;
  } catch {
    // ignore
  }
  return `Ошибка ${res.status}`;
}

export async function lookup(
  payload: { name: string; birth_date: string },
): Promise<RegisterResponse | null> {
  const res = await fetch(`${API_URL}/api/auth/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as RegisterResponse;
}

export async function loginOrRegister(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  const res = await fetch(`${API_URL}/api/auth/login-or-register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as RegisterResponse;
}

export async function me(): Promise<GuestOut | null> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    method: "GET",
    credentials: "include",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(await parseError(res));
  const j = (await res.json()) as { guest: GuestOut };
  return j.guest;
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

// -------- Wishlist --------

export type Priority = "high" | "normal";

export interface WishlistItem {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  price_rub: number | null;
  ozon_url: string | null;
  category: string | null;
  priority: Priority;
  can_be_shared: boolean;
  is_booked: boolean;
  booked_by_me: boolean;
  my_booking_id: string | null;
  my_comment: string | null;
}

export async function listWishlist(): Promise<WishlistItem[]> {
  const res = await fetch(`${API_URL}/api/wishlist`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as WishlistItem[];
}

export async function bookItem(
  itemId: string,
  comment: string,
): Promise<WishlistItem> {
  const res = await fetch(
    `${API_URL}/api/wishlist/items/${itemId}/book`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ comment }),
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as WishlistItem;
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/wishlist/bookings/${bookingId}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!res.ok) throw new Error(await parseError(res));
}

// -------- Event info --------

export interface EventPart {
  type: "christening" | "banquet";
  start_time: string;
  address: string | null;
  yandex_maps_link: string | null;
  program: string | null;
  photos: string[];
  additional_info: string | null;
}

export interface Parent {
  role: "mother" | "father";
  name: string;
  photo_url: string | null;
  phone: string | null;
  telegram_username: string | null;
}

export interface EventInfo {
  title: string;
  dress_code: string | null;
  wishes: string | null;
  countdown_target: string;
  parts: EventPart[];
  parents: Parent[];
}

export interface PublicGuest {
  name: string;
  avatar_url: string;
  avatar_name: string;
  zodiac: string;
  chinese_zodiac: string;
}

export async function getEvent(): Promise<EventInfo> {
  const res = await fetch(`${API_URL}/api/event`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as EventInfo;
}

export async function listPublicGuests(): Promise<PublicGuest[]> {
  const res = await fetch(`${API_URL}/api/event/guests`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as PublicGuest[];
}
