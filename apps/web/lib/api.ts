const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SESSION_KEY = "signal_session_token";

export function getPersonaId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )signal_persona=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setPersonaId(id: string) {
  document.cookie = `signal_persona=${encodeURIComponent(id)}; path=/; max-age=86400; SameSite=Lax`;
}

export function clearPersonaId() {
  document.cookie = "signal_persona=; path=/; max-age=0; SameSite=Lax";
}

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function setSessionToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(SESSION_KEY, token);
  else window.localStorage.removeItem(SESSION_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const persona = getPersonaId();
  if (persona) headers.set("X-Persona-Id", persona);
  const session = getSessionToken();
  if (session && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${session}`);
  }
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    let message = res.statusText;
    let code: string | undefined;
    try {
      const body = (await res.json()) as { detail?: string; code?: string };
      message = body.detail ?? message;
      code = body.code;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status, code);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const data = await apiFetch<{ ok: boolean }>("/healthz");
    return data.ok === true;
  } catch {
    return false;
  }
}

export interface AuthMe {
  authenticated: boolean;
  auth_mode?: string | null;
  user_id?: number | null;
  email?: string | null;
  role?: string | null;
  company_id?: number | null;
  seeker_id?: number | null;
  company_verified?: boolean | null;
  consent_complete: boolean;
  onboarding_completed: boolean;
  consents: Record<string, boolean>;
  privacy_version?: string | null;
  demo_allowed: boolean;
  session_token?: string | null;
}

export function roleHome(role: string | null | undefined): string {
  switch (role) {
    case "company":
      return "/company";
    case "organiser":
    case "advisor":
    case "admin":
    case "dpo":
      return "/organiser/dashboard";
    case "seeker":
    default:
      return "/seeker";
  }
}

/** Where to send a signed-in user next. */
export function postAuthPath(me: AuthMe): string {
  if (!me.authenticated) return "/auth";
  if (!me.consent_complete) return "/consent";
  if (!me.onboarding_completed && (me.role === "seeker" || me.role === "company")) {
    return "/onboarding";
  }
  return roleHome(me.role);
}

export async function applySessionFromMe(me: AuthMe): Promise<void> {
  if (me.session_token) setSessionToken(me.session_token);
  if (me.authenticated && me.auth_mode === "session") clearPersonaId();
}

/** Revoke the server session (if any) and clear local auth state. */
export async function logout(): Promise<void> {
  try {
    await apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
  } catch {
    /* still clear local state */
  }
  setSessionToken(null);
  clearPersonaId();
}
