// API base URL — empty string in dev (Vite proxy handles it), set via env var in production
export const API_BASE = import.meta.env.VITE_API_URL || "";

export function getPassword(): string {
  return sessionStorage.getItem("game_password") || "";
}

export function setPassword(password: string): void {
  sessionStorage.setItem("game_password", password);
}

export function authHeaders(): Record<string, string> {
  return { "X-Game-Password": getPassword() };
}
