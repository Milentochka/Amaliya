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
  telegram_username: string | null;
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

// -------- Telegram binding --------

export interface TelegramBindCode {
  code: string;
  bot_username: string;
  expires_at: string;
}

export async function startTelegramBind(): Promise<TelegramBindCode> {
  const res = await fetch(`${API_URL}/api/auth/me/telegram/start-bind`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as TelegramBindCode;
}

export async function unbindTelegram(): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/me/telegram/unbind`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
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

// -------- Game --------

export interface GameStats {
  total_score: number;
  attempts_today: number;
  attempts_left_today: number;
  rank: number | null;
  is_closed: boolean;
  cutoff_iso: string;
}

export interface LeaderboardEntry {
  rank: number;
  guest_id: string;
  name: string;
  avatar_url: string;
  total_score: number;
}

export interface Leaderboard {
  is_closed: boolean;
  entries: LeaderboardEntry[];
  winner_guest_id: string | null;
}

export async function getGameStats(): Promise<GameStats> {
  const res = await fetch(`${API_URL}/api/game/my-stats`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as GameStats;
}

export async function submitGameAttempt(score: number): Promise<GameStats> {
  const res = await fetch(`${API_URL}/api/game/attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ score }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as GameStats;
}

export async function getLeaderboard(): Promise<Leaderboard> {
  const res = await fetch(`${API_URL}/api/game/leaderboard`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Leaderboard;
}
