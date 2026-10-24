import { z } from "zod/v4";

// Контракт между мобильным приложением и сервером.
// Если меняете поля здесь — обновите app/src/services/ideasApi.ts.

export const RelationSchema = z.enum(["family", "close", "friend", "colleague", "other"]);

export const IdeasRequestSchema = z.object({
  occasion: z.object({
    kind: z.enum(["birthday", "holiday", "event"]),
    title: z.string().min(1).max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    daysLeft: z.number().int().min(0).max(400),
    holidayKind: z.enum(["state", "religious", "professional", "other"]).optional(),
  }),
  people: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        relation: RelationSchema,
        age: z.number().int().min(0).max(130).optional(),
        gender: z.enum(["male", "female"]).optional(),
        interests: z.string().max(1000).optional(),
        notes: z.string().max(1000).optional(),
        profession: z.string().max(200).optional(),
      }),
    )
    .max(10)
    .default([]),
  budget: z.string().max(100).optional(),
  // both — каждое поздравление и на русском, и на казахском.
  language: z.enum(["ru", "kk", "both"]).default("both"),
  // Названия уже предложенных подарков — чтобы «Ещё идеи» не повторялись.
  exclude: z.array(z.string().max(200)).max(30).default([]),
});

export type IdeasRequest = z.infer<typeof IdeasRequestSchema>;

export const IdeasResponseSchema = z.object({
  gifts: z.array(
    z.object({
      title: z.string(),
      why: z.string(),
      priceRange: z.string(),
    }),
  ),
  greetings: z.array(
    z.object({
      style: z.string(),
      language: z.enum(["ru", "kk"]),
      text: z.string(),
    }),
  ),
  tips: z.array(z.string()),
});

export type IdeasResponse = z.infer<typeof IdeasResponseSchema>;
