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
    const body = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    return `HTTP ${status} ${statusText || ''}: ${body}`;
  }

  // Axios error without response (network error, timeout)
  if (e.request) {
    return `Network error: ${e.message || 'Request failed'}${e.code ? ` (${e.code})` : ''}`;
  }

  // Regular Error or unknown
  return err instanceof Error ? err.message : String(err);
}
