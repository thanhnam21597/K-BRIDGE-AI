type Bucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = rateLimitBuckets.get(key);

  if (!existing || now >= existing.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: windowMs };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    };
  }

  existing.count += 1;
  rateLimitBuckets.set(key, existing);
  return {
    ok: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterMs: Math.max(0, existing.resetAt - now),
  };
}

export function createRateLimitKey(request: Request, scope: string, subject = "anonymous") {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim() || "unknown-ip";
  return `${scope}:${subject}:${ip}`;
}
