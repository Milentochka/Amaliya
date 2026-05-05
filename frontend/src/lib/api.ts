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
