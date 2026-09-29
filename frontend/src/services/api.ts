const API: string = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(API + path, options);
  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try { message = JSON.parse(text).detail ?? text; } catch { /* plain text body */ }
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body: unknown = {}) => request<T>(path, json("POST", body)),
  put: <T,>(path: string, body: unknown) => request<T>(path, json("PUT", body)),
  upload: <T,>(path: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<T>(path, { method: "POST", body: form });
  },
};

export const errorMessage = (e: unknown, fallback = "Something went wrong.") =>
  e instanceof Error && e.message ? e.message : fallback;
