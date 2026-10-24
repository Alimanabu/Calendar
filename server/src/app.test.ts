import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { RefusalError } from "./ideas.js";
import { buildUserPrompt } from "./prompt.js";
import { IdeasRequestSchema, type IdeasResponse } from "./schema.js";

const TOKEN = "test-token-1234567890";

const sampleResponse: IdeasResponse = {
  gifts: [{ title: "Книга", why: "Любит читать", priceRange: "5 000–10 000 ₸" }],
  greetings: [{ style: "тёплое", text: "С днём рождения!" }],
  tips: ["Закажите заранее"],
};

const validBody = {
  occasion: { kind: "birthday", title: "День рождения: Мама", date: "2026-11-24", daysLeft: 31 },
  people: [{ name: "Мама", relation: "family", age: 55, interests: "сад, вязание" }],
};

function post(app: ReturnType<typeof createApp>, body: unknown, token = TOKEN) {
  return app.request("/v1/ideas", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

describe("POST /v1/ideas", () => {
  it("returns ideas for a valid request", async () => {
    const generate = vi.fn().mockResolvedValue(sampleResponse);
    const app = createApp({ generate, appToken: TOKEN, hourlyLimit: 10 });
    const res = await post(app, validBody);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(sampleResponse);
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ language: "ru", exclude: [] }));
  });

  it("rejects a wrong token", async () => {
    const generate = vi.fn();
    const app = createApp({ generate, appToken: TOKEN, hourlyLimit: 10 });
    const res = await post(app, validBody, "wrong-token");
    expect(res.status).toBe(401);
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects an invalid body", async () => {
    const app = createApp({ generate: vi.fn(), appToken: TOKEN, hourlyLimit: 10 });
    const res = await post(app, { occasion: { kind: "birthday" } });
    expect(res.status).toBe(400);
  });

  it("enforces the hourly limit and resets it after an hour", async () => {
    let t = 0;
    const app = createApp({
      generate: vi.fn().mockResolvedValue(sampleResponse),
      appToken: TOKEN,
      hourlyLimit: 2,
      now: () => t,
    });
    expect((await post(app, validBody)).status).toBe(200);
    expect((await post(app, validBody)).status).toBe(200);
    expect((await post(app, validBody)).status).toBe(429);
    t += 60 * 60 * 1000;
    expect((await post(app, validBody)).status).toBe(200);
  });

  it("maps a refusal to 422", async () => {
    const app = createApp({
      generate: vi.fn().mockRejectedValue(new RefusalError("no")),
      appToken: TOKEN,
      hourlyLimit: 10,
    });
    expect((await post(app, validBody)).status).toBe(422);
  });
});

describe("buildUserPrompt", () => {
  it("includes person details, budget, exclusions and language", () => {
    const req = IdeasRequestSchema.parse({
      ...validBody,
      budget: "до 20 000 ₸",
      language: "kk",
      exclude: ["Книга"],
    });
    const prompt = buildUserPrompt(req);
    expect(prompt).toContain("Мама — член семьи; возраст: 55; интересы: сад, вязание");
    expect(prompt).toContain("через 31 дн.");
    expect(prompt).toContain("Бюджет: до 20 000 ₸");
    expect(prompt).toContain("уже предлагались, придумай другие: Книга");
    expect(prompt).toContain("на казахском");
  });

  it("handles holidays without specific people", () => {
    const req = IdeasRequestSchema.parse({
      occasion: {
        kind: "holiday",
        title: "День Республики",
        date: "2026-10-25",
        daysLeft: 0,
        holidayKind: "state",
      },
    });
    const prompt = buildUserPrompt(req);
    expect(prompt).toContain("сегодня");
    expect(prompt).toContain("государственный праздник Казахстана");
    expect(prompt).toContain("Конкретные люди не указаны");
  });
});
