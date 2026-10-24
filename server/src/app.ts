import { timingSafeEqual } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { BadModelOutputError, RefusalError, type IdeasGenerator } from "./ideas.js";
import { IdeasRequestSchema } from "./schema.js";

export interface AppOptions {
  generate: IdeasGenerator;
  /** Общий секрет, который приложение передаёт в заголовке Authorization. */
  appToken: string;
  /** Сколько запросов к Claude разрешено в час на весь сервер — защита счёта от утечки токена. */
  hourlyLimit: number;
  now?: () => number;
}

function tokensEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function createApp({ generate, appToken, hourlyLimit, now = Date.now }: AppOptions) {
  const app = new Hono();
  let windowStart = now();
  let windowCount = 0;

  app.get("/health", (c) => c.json({ ok: true }));

  app.use("/v1/*", async (c, next) => {
    const header = c.req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
    if (!token || !tokensEqual(token, appToken)) {
      return c.json({ error: "unauthorized" }, 401);
    }
    await next();
  });

  app.post("/v1/ideas", bodyLimit({ maxSize: 32 * 1024 }), async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = IdeasRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid_request", details: parsed.error.issues }, 400);
    }

    const t = now();
    if (t - windowStart >= 60 * 60 * 1000) {
      windowStart = t;
      windowCount = 0;
    }
    if (windowCount >= hourlyLimit) {
      return c.json({ error: "rate_limited" }, 429);
    }
    windowCount++;

    try {
      return c.json(await generate(parsed.data));
    } catch (err) {
      if (err instanceof RefusalError) {
        return c.json({ error: "refused" }, 422);
      }
      if (err instanceof BadModelOutputError) {
        console.error("ideas: bad model output", err.message);
        return c.json({ error: "bad_model_output" }, 502);
      }
      if (err instanceof Anthropic.RateLimitError) {
        return c.json({ error: "upstream_rate_limited" }, 503);
      }
      if (err instanceof Anthropic.APIError) {
        console.error("ideas: anthropic error", err.status, err.message);
        return c.json({ error: "upstream_error" }, 502);
      }
      console.error("ideas: unexpected error", err);
      return c.json({ error: "internal_error" }, 500);
    }
  });

  return app;
}
