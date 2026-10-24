import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt.js";
import { IdeasResponseSchema, type IdeasRequest, type IdeasResponse } from "./schema.js";

export const DEFAULT_MODEL = "claude-opus-5-5";

/** Claude отказался отвечать (сработали фильтры безопасности). */
export class RefusalError extends Error {}

/** Ответ пришёл, но не соответствует схеме (например, обрезан по max_tokens). */
export class BadModelOutputError extends Error {}

export type IdeasGenerator = (req: IdeasRequest) => Promise<IdeasResponse>;

export function createIdeasGenerator(
  client: Anthropic,
  model: string = DEFAULT_MODEL,
): IdeasGenerator {
  return async (req) => {
    // create(), а не parse(): parse() бросает ошибку разбора раньше, чем мы успеем
    // проверить stop_reason, и отказ выглядел бы как сломанный JSON.
    const response = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      // Если основная модель откажется, сервер Anthropic сам повторит запрос на запасной.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: betaZodOutputFormat(IdeasResponseSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(req) }],
    });

    if (response.stop_reason === "refusal") {
      throw new RefusalError(response.stop_details?.explanation ?? "refusal");
    }
    if (response.stop_reason !== "end_turn") {
      throw new BadModelOutputError(`stop_reason=${response.stop_reason}`);
    }

    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new BadModelOutputError("reply is not valid JSON");
    }
    const parsed = IdeasResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new BadModelOutputError(parsed.error.message);
    }
    return parsed.data;
  };
}
