/**
 * Talks to the API through the same-origin /api proxy (next.config.ts), so the session cookie is
 * first-party in every browser (ADR 0003). Errors come back as ApiError with a message a person
 * can act on; field errors from the API's details are kept for the forms.
 */

export interface FieldError {
  path: string;
  message: string;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "Please check the highlighted fields.",
  401: "Please log in again.",
  403: "You don't have permission to do this.",
  404: "We couldn't find that.",
  409: "This can't be done right now.",
  413: "That's too large to send.",
  429: "Too many attempts. Please wait a few minutes and try again.",
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** The API's per-field problems (a 400's details), if any. */
  get fieldErrors(): FieldError[] {
    if (!Array.isArray(this.details)) return [];
    return this.details.filter(
      (item): item is FieldError =>
        typeof item === "object" && item !== null && typeof item.path === "string" && typeof item.message === "string",
    );
  }

  /** A machine-readable reason the API added to a 409, such as "PAN_REGISTERED". */
  get reason(): string | undefined {
    const details = this.details;
    if (typeof details === "object" && details !== null && "reason" in details && typeof details.reason === "string") {
      return details.reason;
    }
    return undefined;
  }
}

function toApiError(status: number, body: unknown): ApiError {
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = (body as { error: { code?: unknown; message?: unknown; details?: unknown } }).error;
    const message = typeof error.message === "string" ? error.message : (STATUS_MESSAGES[status] ?? "");
    return new ApiError(status, typeof error.code === "string" ? error.code : "UNKNOWN", message, error.details);
  }
  return new ApiError(status, "UNKNOWN", STATUS_MESSAGES[status] ?? "Something went wrong on our side. Please try again.");
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK", "We can't reach the server. Check your connection and try again.");
  }
  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw toApiError(response.status, data);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
};

/**
 * Sends a file to a short-lived upload link the API issued (GAPS G-B03): straight to storage,
 * never through the API's JSON routes.
 */
export async function uploadToLink(link: { url: string; method: "PUT"; headers: Record<string, string> }, file: File) {
  let response: Response;
  try {
    response = await fetch(link.url, { method: link.method, headers: link.headers, body: file });
  } catch {
    throw new ApiError(0, "NETWORK", "The upload failed. Check your connection and try again.");
  }
  if (!response.ok) {
    throw toApiError(response.status, await response.json().catch(() => null));
  }
}

export function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message || STATUS_MESSAGES[error.status] || "Something went wrong.";
  return "Something went wrong. Please try again.";
}
