// API base URL — empty string in dev (Vite proxy handles it), set via env var in production
export const API_BASE = import.meta.env.VITE_API_URL || "";
