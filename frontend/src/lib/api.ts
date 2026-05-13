// All API calls are same-origin — Next.js rewrites in next.config.mjs proxy
// /api/* to the backend. Keeps the auth cookie first-party.
const API_URL = "";

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

// -------- RSVP --------

export interface MyRsvp {
  christening: RsvpStatus;
  banquet: RsvpStatus;
}

export async function getRsvp(): Promise<MyRsvp> {
  const res = await fetch(`${API_URL}/api/auth/me/rsvp`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MyRsvp;
}

export async function patchRsvp(
  updates: Partial<MyRsvp>,
): Promise<MyRsvp> {
  const res = await fetch(`${API_URL}/api/auth/me/rsvp`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MyRsvp;
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

// -------- Admin --------

export interface AdminOut {
  id: number;
  role: "mom" | "dad";
  login: string;
}

export async function adminLogin(
  login: string,
  password: string,
): Promise<AdminOut> {
  const res = await fetch(`${API_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ login, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as AdminOut;
}

export async function adminLogout(): Promise<void> {
  await fetch(`${API_URL}/api/admin/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function adminMe(): Promise<{ admin_id: number } | null> {
  const res = await fetch(`${API_URL}/api/admin/me`, {
    credentials: "include",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { admin_id: number };
}

export interface StatsCounts {
  coming: number;
  not_coming: number;
  maybe: number;
}

export interface DashboardStats {
  guests_total: number;
  christening: StatsCounts;
  banquet: StatsCounts;
  wishlist_total: number;
  wishlist_booked: number;
  wishlist_free: number;
  bookings_total: number;
  bookings_sum_rub: number;
  game_players: number;
  game_attempts: number;
}

export async function adminDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_URL}/api/admin/dashboard/stats`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as DashboardStats;
}

export interface GuestAdmin {
  id: string;
  name: string;
  birth_date: string;
  gender: "M" | "F";
  avatar_name: string;
  avatar_url: string;
  has_telegram: boolean;
  telegram_username: string | null;
  rsvp_christening: RsvpStatus;
  rsvp_banquet: RsvpStatus;
  bookings_count: number;
  last_activity: string | null;
  created_at: string;
}

export async function adminListGuests(): Promise<GuestAdmin[]> {
  const res = await fetch(`${API_URL}/api/admin/guests`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as GuestAdmin[];
}

export async function adminPatchGuestRsvp(
  guestId: string,
  updates: { christening?: RsvpStatus; banquet?: RsvpStatus },
): Promise<MyRsvp> {
  const res = await fetch(`${API_URL}/api/admin/guests/${guestId}/rsvp`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MyRsvp;
}

export async function adminDeleteGuest(guestId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/guests/${guestId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export interface BookingAdmin {
  booking_id: string;
  item_id: string;
  item_name: string;
  item_price_rub: number | null;
  guest_id: string;
  guest_name: string;
  comment: string;
  created_at: string;
}

export async function adminListBookings(): Promise<BookingAdmin[]> {
  const res = await fetch(`${API_URL}/api/admin/bookings`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as BookingAdmin[];
}

export async function adminCancelBooking(bookingId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/bookings/${bookingId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
}

// -------- Admin wishlist CRUD --------

export interface WishlistItemAdmin extends WishlistItem {
  bookers: { guest_id: string; name: string; comment: string }[];
}

export interface WishlistItemPayload {
  name: string;
  description?: string | null;
  photo_url?: string | null;
  price_rub?: number | null;
  ozon_url?: string | null;
  category?: string | null;
  priority: Priority;
  can_be_shared: boolean;
}

export async function adminListWishlist(): Promise<WishlistItemAdmin[]> {
  const res = await fetch(`${API_URL}/api/admin/wishlist/items`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as WishlistItemAdmin[];
}

export async function adminCreateWishlistItem(
  payload: WishlistItemPayload,
): Promise<WishlistItemAdmin> {
  const res = await fetch(`${API_URL}/api/admin/wishlist/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as WishlistItemAdmin;
}

export async function adminUpdateWishlistItem(
  itemId: string,
  payload: Partial<WishlistItemPayload>,
): Promise<WishlistItemAdmin> {
  const res = await fetch(`${API_URL}/api/admin/wishlist/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as WishlistItemAdmin;
}

export async function adminDeleteWishlistItem(itemId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/wishlist/items/${itemId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
}
