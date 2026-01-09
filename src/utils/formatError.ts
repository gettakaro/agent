interface AxiosLikeError {
  response?: { status?: number; statusText?: string; data?: unknown };
  request?: unknown;
  message?: string;
  code?: string;
}

export function formatError(err: unknown): string {
  const e = err as AxiosLikeError;

  // Axios error with response (server returned error status)
  if (e.response) {
    const { status, statusText, data } = e.response;
    const body = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    return `HTTP ${status} ${statusText || ""}: ${body}`;
  }

  // Axios error without response (network error, timeout)
  if (e.request) {
    return `Network error: ${e.message || "Request failed"}${e.code ? ` (${e.code})` : ""}`;
  }

  // Regular Error or unknown
  return err instanceof Error ? err.message : String(err);
}

/**
 * Get HTTP status code from error if available
 */
function getErrorStatus(err: unknown): number | undefined {
  const e = err as AxiosLikeError;
  return e.response?.status;
}

/**
 * Check if error is a client error (4xx status code)
 */
function isClientError(err: unknown): boolean {
  const status = getErrorStatus(err);
  return status !== undefined && status >= 400 && status < 500;
}

/**
 * Log error at appropriate level based on status code
 * - 4xx (client errors): console.warn
 * - 5xx (server errors) or unknown: console.error
 */
export function logError(prefix: string, err: unknown): void {
  const message = `${prefix} ${formatError(err)}`;
  if (isClientError(err)) {
    console.warn(message);
  } else {
    console.error(message);
  }
}
