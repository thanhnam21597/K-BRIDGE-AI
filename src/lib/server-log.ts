export function logApiError(
  scope: string,
  error: unknown,
  metadata?: Record<string, unknown>,
) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(
    JSON.stringify({
      level: "error",
      scope,
      message,
      metadata: metadata ?? {},
      stack,
      timestamp: new Date().toISOString(),
    }),
  );
}
