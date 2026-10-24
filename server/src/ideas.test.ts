import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { BadModelOutputError, RefusalError, createIdeasGenerator } from "./ideas.js";
import { IdeasRequestSchema } from "./schema.js";

const request = IdeasRequestSchema.parse({
  occasion: { kind: "birthday", title: "День рождения: Арман", date: "2026-11-01", daysLeft: 7 },
  people: [{ name: "Арман", relation: "friend", interests: "футбол" }],
});

function fakeClient(reply: { stop_reason: string; text: string }) {
  const calls: { headers: Headers; body: any }[] = [];
  const client = new Anthropic({
    apiKey: "test",
    maxRetries: 0,
    fetch: async (_url, init) => {
      calls.push({ headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) });
      const message = {
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-opus-5-5",
        content: [{ type: "text", text: reply.text }],
        stop_reason: reply.stop_reason,
        stop_details: null,
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 10 },
      };
      return new Response(JSON.stringify(message), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });
  return { client, calls };
}

describe("createIdeasGenerator", () => {
  it("sends a structured-output request with server-side fallback and parses the reply", async () => {
    const ideas = {
      gifts: [{ title: "Мяч", why: "Любит футбол", priceRange: "15 000 ₸" }],
      greetings: [
        { style: "короткое", language: "ru", text: "Арман, с днём рождения!" },
        { style: "короткое", language: "kk", text: "Арман, туған күніңмен!" },
      ],
      tips: [],
    };
    const { client, calls } = fakeClient({ stop_reason: "end_turn", text: JSON.stringify(ideas) });

    const result = await createIdeasGenerator(client)(request);

    expect(result).toEqual(ideas);
    const { headers, body } = calls[0];
    expect(headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.fallbacks).toBe("default");
    expect(body.output_config.effort).toBe("medium");
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.output_config.format.schema.required).toEqual(["gifts", "greetings", "tips"]);
    expect(body.messages[0].content).toContain("Арман — друг или приятель");
  });

  it("throws RefusalError on a refusal", async () => {
    const { client } = fakeClient({ stop_reason: "refusal", text: "" });
    await expect(createIdeasGenerator(client)(request)).rejects.toBeInstanceOf(RefusalError);
  });

  it("does not return unvalidated output when the reply is truncated", async () => {
    const { client } = fakeClient({ stop_reason: "max_tokens", text: '{"gifts": [' });
    await expect(createIdeasGenerator(client)(request)).rejects.toBeInstanceOf(BadModelOutputError);
  });
});
