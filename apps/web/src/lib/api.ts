// Thin client for the .NET gateway. Sends the HttpOnly session cookie with every request.
// TODO: generate types from the backend OpenAPI spec; add TanStack Query hooks.
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export async function api(path: string, init?: RequestInit) {
  return fetch(`${API_BASE}${path}`, { credentials: "include", ...init });
}

/** Thrown for non-2xx responses so callers can branch on `.status` (e.g. 401 → signed out). */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || res.statusText);
  }
  // 204 No Content (and empty bodies) have nothing to parse.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const jsonBody = (body: unknown): RequestInit =>
  body === undefined
    ? {}
    : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };

export async function getJson<T>(path: string): Promise<T> {
  return parse<T>(await api(path));
}

export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  return parse<T>(await api(path, { method: "POST", ...jsonBody(body) }));
}

export async function putJson<T>(path: string, body?: unknown): Promise<T> {
  return parse<T>(await api(path, { method: "PUT", ...jsonBody(body) }));
}

/**
 * POST multipart/form-data (e.g. a file upload). No Content-Type header on purpose — the browser
 * sets it with the correct multipart boundary once a FormData body is attached.
 */
export async function postForm<T>(path: string, form: FormData): Promise<T> {
  return parse<T>(await api(path, { method: "POST", body: form }));
}
