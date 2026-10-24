import Anthropic from "@anthropic-ai/sdk";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { DEFAULT_MODEL, createIdeasGenerator } from "./ideas.js";

const appToken = process.env.APP_TOKEN;
if (!appToken || appToken.length < 16) {
  console.error("APP_TOKEN не задан или короче 16 символов — см. server/.env.example");
  process.exit(1);
}

// Ключ берётся из ANTHROPIC_API_KEY.
const client = new Anthropic();
const model = process.env.CLAUDE_MODEL || DEFAULT_MODEL;
const port = Number(process.env.PORT ?? 8787);

const app = createApp({
  generate: createIdeasGenerator(client, model),
  appToken,
  hourlyLimit: Number(process.env.HOURLY_LIMIT ?? 60),
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Сервер идей запущен на порту ${info.port}, модель ${model}`);
});
