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

export interface AdminGuestCreatePayload {
  name: string;
  birth_date: string; // DD/MM/YY
  gender: "M" | "F";
  rsvp_christening?: RsvpStatus;
  rsvp_banquet?: RsvpStatus;
}

export async function adminCreateGuest(
  payload: AdminGuestCreatePayload,
): Promise<GuestAdmin> {
  const res = await fetch(`${API_URL}/api/admin/guests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as GuestAdmin;
}

export interface AdminGuestUpdatePayload {
  name?: string;
  birth_date?: string; // DD/MM/YY
  gender?: "M" | "F";
  avatar_id?: number;
  unbind_telegram?: boolean;
}

export async function adminUpdateGuest(
  guestId: string,
  payload: AdminGuestUpdatePayload,
): Promise<GuestAdmin> {
  const res = await fetch(`${API_URL}/api/admin/guests/${guestId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as GuestAdmin;
}

export interface AvatarShort {
  id: number;
  name: string;
  image_url: string;
  is_taken: boolean;
  reserved_for_admin: boolean;
}

export async function adminListAvatars(): Promise<AvatarShort[]> {
  const res = await fetch(`${API_URL}/api/admin/avatars`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as AvatarShort[];
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

export interface GamePlayer {
  rank: number;
  guest_id: string;
  guest_name: string;
  avatar_url: string;
  avatar_name: string;
  attempts: number;
  total_score: number;
  best_score: number;
  first_played_at: string;
  last_played_at: string;
}

export async function adminListGame(): Promise<GamePlayer[]> {
  const res = await fetch(`${API_URL}/api/admin/game`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as GamePlayer[];
}

// -------- Host / Projector (Contests) --------

export type ContestStatus = "not_started" | "active" | "closed";

export type Contest1Stage = 1 | 2 | 3;

export interface ContestState {
  contest_id: number;
  status: ContestStatus;
  active_step: Record<string, unknown>;
}

export interface RelativeVote {
  name: string;
  count: number;
}

export interface Contest1Trait {
  id: number;
  order_index: number;
  name: string;
  votes_mom: number;
  votes_dad: number;
  votes_unique: number;
  votes_relatives: RelativeVote[];
}

export interface Contest1Summary {
  totals: { mom: number; dad: number; unique: number; relatives: number };
  top_relative_name: string | null;
  top_relative_count: number;
  verdict: string | null;
}

export interface Contest1Overview {
  state: ContestState;
  traits: Contest1Trait[];
  summary: Contest1Summary;
}

export async function hostContestsList(): Promise<ContestState[]> {
  const res = await fetch(`${API_URL}/api/host/contests`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ContestState[];
}

export async function hostSetContestStatus(
  contestId: number,
  status: ContestStatus,
): Promise<ContestState> {
  const res = await fetch(`${API_URL}/api/host/contests/${contestId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ContestState;
}

export async function hostContest1Overview(): Promise<Contest1Overview> {
  const res = await fetch(`${API_URL}/api/host/contest1`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest1Overview;
}

export interface Contest1TallyUpdate {
  votes_mom?: number;
  votes_dad?: number;
  votes_unique?: number;
  votes_relatives?: RelativeVote[];
}

export async function hostContest1SetTally(
  traitId: number,
  payload: Contest1TallyUpdate,
): Promise<Contest1Trait> {
  const res = await fetch(
    `${API_URL}/api/host/contest1/traits/${traitId}/tally`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest1Trait;
}

export async function hostContest1Reset(): Promise<void> {
  const res = await fetch(`${API_URL}/api/host/contest1/reset`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function hostContest1SetStage(
  stage: Contest1Stage,
): Promise<ContestState> {
  const res = await fetch(`${API_URL}/api/host/contest1/stage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ stage }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ContestState;
}

export async function projectorContest1Overview(): Promise<Contest1Overview> {
  const res = await fetch(`${API_URL}/api/projector/contest1`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest1Overview;
}

export async function projectorContestsList(): Promise<ContestState[]> {
  const res = await fetch(`${API_URL}/api/projector/contests`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ContestState[];
}

// -------- Contest 2 («Знаете ли вы») --------

export interface Contest2Question {
  id: number;
  order_index: number;
  text: string;
  options: string[];
  correct_index: number | null;
  first_correct_name: string | null;
  first_correct_guest_id: string | null;
}

export interface Contest2LeaderRow {
  name: string;
  wins: number;
}

export interface Contest2Overview {
  state: ContestState;
  questions: Contest2Question[];
  leaderboard: Contest2LeaderRow[];
  winner_name: string | null;
  answered: number;
  total: number;
}

export async function hostContest2Overview(): Promise<Contest2Overview> {
  const res = await fetch(`${API_URL}/api/host/contest2`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest2Overview;
}

export async function hostContest2SetActive(
  questionId: number | null,
  showAnswer: boolean,
): Promise<ContestState> {
  const res = await fetch(`${API_URL}/api/host/contest2/active`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ question_id: questionId, show_answer: showAnswer }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ContestState;
}

export async function hostContest2SetFirst(
  questionId: number,
  payload: { guest_id?: string | null; guest_name?: string | null },
): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/host/contest2/questions/${questionId}/first`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
}

export async function hostContest2ClearFirst(
  questionId: number,
): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/host/contest2/questions/${questionId}/first`,
    { method: "DELETE", credentials: "include" },
  );
  if (!res.ok) throw new Error(await parseError(res));
}

export async function hostContest2Reset(): Promise<void> {
  const res = await fetch(`${API_URL}/api/host/contest2/reset`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function projectorContest2Overview(): Promise<Contest2Overview> {
  const res = await fetch(`${API_URL}/api/projector/contest2`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest2Overview;
}

// -------- Contest 3 («50 обещаний») --------

export interface Contest3Stats {
  state: ContestState;
  total_promises: number;
  assigned_total: number;
  read_total: number;
  guests_total: number;
  guests_with_assignments: number;
  guests_done: number;
}

export interface Contest3PromiseView {
  id: number;
  text: string;
  read_aloud_at: string | null;
}

export interface Contest3CurrentGuest {
  guest_id: string;
  guest_name: string;
  avatar_url: string;
  avatar_name: string;
  promises: Contest3PromiseView[];
}

export interface Contest3ProjectorView {
  state: ContestState;
  current: Contest3CurrentGuest | null;
}

export async function hostContest3Stats(): Promise<Contest3Stats> {
  const res = await fetch(`${API_URL}/api/host/contest3`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest3Stats;
}

export async function hostContest3Assign(
  perGuest: number = 2,
): Promise<Contest3Stats> {
  const res = await fetch(`${API_URL}/api/host/contest3/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ per_guest: perGuest }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest3Stats;
}

export async function hostContest3Next(): Promise<Contest3CurrentGuest> {
  const res = await fetch(`${API_URL}/api/host/contest3/next`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest3CurrentGuest;
}

export async function hostContest3MarkRead(
  promiseIds: number[],
): Promise<void> {
  const res = await fetch(`${API_URL}/api/host/contest3/mark-read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ promise_ids: promiseIds }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function hostContest3ClearActive(): Promise<void> {
  const res = await fetch(`${API_URL}/api/host/contest3/clear-active`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function hostContest3Reset(): Promise<void> {
  const res = await fetch(`${API_URL}/api/host/contest3/reset`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function hostContest3Restart(): Promise<void> {
  const res = await fetch(`${API_URL}/api/host/contest3/restart`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export interface Contest3PromiseRow {
  id: number;
  text: string;
  is_assigned: boolean;
  is_read: boolean;
  guest_id: string | null;
  guest_name: string | null;
}

export async function hostContest3ListPromises(): Promise<Contest3PromiseRow[]> {
  const res = await fetch(`${API_URL}/api/host/contest3/promises`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest3PromiseRow[];
}

export async function hostContest3EditPromise(
  promiseId: number,
  text: string,
): Promise<{ id: number; text: string }> {
  const res = await fetch(`${API_URL}/api/host/contest3/promises/${promiseId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { id: number; text: string };
}

export async function hostContest3AssignPromise(
  promiseId: number,
  guestId: string | null,
): Promise<{ id: number; guest_id: string | null; guest_name: string | null }> {
  const res = await fetch(
    `${API_URL}/api/host/contest3/promises/${promiseId}/assign`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ guest_id: guestId }),
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as {
    id: number;
    guest_id: string | null;
    guest_name: string | null;
  };
}

export async function projectorContest3View(): Promise<Contest3ProjectorView> {
  const res = await fetch(`${API_URL}/api/projector/contest3`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest3ProjectorView;
}

// -------- Contest 4 («Знак зодиака») --------

export interface Contest4Trait {
  order_index: number;
  text: string;
}

export interface Contest4GuestRef {
  id: string;
  name: string;
  avatar_url: string;
  avatar_name: string;
}

export interface Contest4Zodiac {
  key: string;
  name: string;
  glyph: string;
  traits: Contest4Trait[];
  guests: Contest4GuestRef[];
}

export interface Contest4Overview {
  state: ContestState;
  zodiacs: Contest4Zodiac[];
}

export interface Contest4CurrentZodiac {
  key: string;
  name: string;
  glyph: string;
  traits: Contest4Trait[];
  selected_trait_indices: number[];
  guests: Contest4GuestRef[];
}

export interface Contest4ProjectorView {
  state: ContestState;
  current: Contest4CurrentZodiac | null;
}

export async function hostContest4Overview(): Promise<Contest4Overview> {
  const res = await fetch(`${API_URL}/api/host/contest4`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest4Overview;
}

export async function hostContest4SetActive(
  zodiacKey: string | null,
): Promise<ContestState> {
  const res = await fetch(`${API_URL}/api/host/contest4/active`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ zodiac_key: zodiacKey }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ContestState;
}

export async function projectorContest4View(): Promise<Contest4ProjectorView> {
  const res = await fetch(`${API_URL}/api/projector/contest4`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest4ProjectorView;
}

export async function hostContest4ToggleTrait(
  orderIndex: number,
): Promise<ContestState> {
  const res = await fetch(`${API_URL}/api/host/contest4/trait`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ order_index: orderIndex }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ContestState;
}

// -------- Contest 5 («Своя игра») --------

export interface Contest5QuestionCell {
  id: number;
  value: number;
  answered_status: "unanswered" | "correct" | "wrong" | "skipped";
  answered_team_id: number | null;
  text: string | null;
  answer: string | null;
  image_key: string | null;
  answer_image_key: string | null;
}

export interface Contest5Category {
  id: number;
  name: string;
  slug: string;
  order_index: number;
  questions: Contest5QuestionCell[];
}

export interface Contest5Team {
  id: number;
  name: string;
  color: string;
  score: number;
  final_wager: number;
  final_correct: boolean | null;
  order_index: number;
}

export interface Contest5Final {
  text: string | null;
  answer: string | null;
  revealed: boolean;
}

export interface Contest5Overview {
  state: ContestState;
  categories: Contest5Category[];
  teams: Contest5Team[];
  final: Contest5Final | null;
}

export interface Contest5ActiveQuestion {
  id: number;
  category_name: string;
  value: number;
  text: string;
  answer: string | null;
  image_key: string | null;
  answer_image_key: string | null;
}

export interface Contest5ProjectorView extends Contest5Overview {
  active_question: Contest5ActiveQuestion | null;
  final_active: boolean;
  final_question: Contest5Final | null;
}

export async function hostContest5Overview(): Promise<Contest5Overview> {
  const res = await fetch(`${API_URL}/api/host/contest5`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest5Overview;
}

export async function hostContest5Open(questionId: number): Promise<Contest5Overview> {
  const res = await fetch(`${API_URL}/api/host/contest5/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ question_id: questionId }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest5Overview;
}

export async function hostContest5ShowAnswer(): Promise<Contest5Overview> {
  const res = await fetch(`${API_URL}/api/host/contest5/show-answer`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest5Overview;
}

export async function hostContest5Resolve(
  questionId: number,
  teamId: number | null,
  correct: boolean,
): Promise<Contest5Overview> {
  const res = await fetch(`${API_URL}/api/host/contest5/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ question_id: questionId, team_id: teamId, correct }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest5Overview;
}

export async function hostContest5Close(): Promise<Contest5Overview> {
  const res = await fetch(`${API_URL}/api/host/contest5/close`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest5Overview;
}

export async function hostContest5UpdateTeam(
  teamId: number,
  patch: {
    name?: string;
    color?: string;
    score?: number;
    final_wager?: number;
    final_correct?: boolean | null;
  },
): Promise<Contest5Overview> {
  const res = await fetch(`${API_URL}/api/host/contest5/teams/${teamId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest5Overview;
}

export async function hostContest5OpenFinal(): Promise<Contest5Overview> {
  const res = await fetch(`${API_URL}/api/host/contest5/final/open`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest5Overview;
}

export async function hostContest5RevealFinal(): Promise<Contest5Overview> {
  const res = await fetch(`${API_URL}/api/host/contest5/final/reveal`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest5Overview;
}

export async function hostContest5ResolveFinal(): Promise<Contest5Overview> {
  const res = await fetch(`${API_URL}/api/host/contest5/final/resolve`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest5Overview;
}

export async function hostContest5Reset(): Promise<Contest5Overview> {
  const res = await fetch(`${API_URL}/api/host/contest5/reset`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest5Overview;
}

export async function projectorContest5View(): Promise<Contest5ProjectorView> {
  const res = await fetch(`${API_URL}/api/projector/contest5`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Contest5ProjectorView;
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

// -------- Family media (local-only projector slideshow) --------

export interface FamilyMedia {
  id: number;
  kind: "photo" | "video" | "music";
  filename: string;
  url: string;
  order_index: number;
}

export async function hostFamilyMediaList(): Promise<FamilyMedia[]> {
  const res = await fetch(`${API_URL}/api/host/media`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as FamilyMedia[];
}

export async function hostFamilyMediaUpload(file: File): Promise<FamilyMedia> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/api/host/media`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as FamilyMedia;
}

export async function hostFamilyMediaDelete(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/host/media/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function hostFamilyMediaReorder(
  ids: number[],
): Promise<FamilyMedia[]> {
  const res = await fetch(`${API_URL}/api/host/media/order`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as FamilyMedia[];
}

export async function projectorFamilyMediaList(): Promise<FamilyMedia[]> {
  const res = await fetch(`${API_URL}/api/projector/media`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as FamilyMedia[];
}

// -------- Projector mode (slideshow vs contests + music) --------

export interface ProjectorMode {
  contests_enabled: boolean;
  music_enabled: boolean;
  music_volume: number; // 0..100
}

export interface ProjectorModeUpdate {
  contests_enabled?: boolean;
  music_enabled?: boolean;
  music_volume?: number;
}

export async function projectorGetMode(): Promise<ProjectorMode> {
  const res = await fetch(`${API_URL}/api/projector/mode`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ProjectorMode;
}

export async function hostGetProjectorMode(): Promise<ProjectorMode> {
  const res = await fetch(`${API_URL}/api/host/projector/mode`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ProjectorMode;
}

export async function hostSetProjectorMode(
  patch: boolean | ProjectorModeUpdate,
): Promise<ProjectorMode> {
  // Back-compat: a bare boolean is treated as `contests_enabled` (the
  // original signature). New code passes a partial-update object.
  const body: ProjectorModeUpdate =
    typeof patch === "boolean" ? { contests_enabled: patch } : patch;
  const res = await fetch(`${API_URL}/api/host/projector/mode`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ProjectorMode;
}
