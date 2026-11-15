import { z } from "zod";
export const aiConfigured = () =>
  Boolean(process.env.OLLAMA_URL && process.env.OLLAMA_MODEL);
export async function narrate(
  facts: Record<string, string>,
  transport: typeof fetch = fetch,
) {
  const url = process.env.OLLAMA_URL,
    model = process.env.OLLAMA_MODEL;
  if (!url || !model) throw new Error("No report model is configured.");
  const result = await transport(new URL("/api/chat", url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.OLLAMA_TOKEN
        ? { Authorization: "Bearer " + process.env.OLLAMA_TOKEN }
        : {}),
    },
    body: JSON.stringify({
      model,
      stream: false,
      format: {
        type: "object",
        properties: {
          highlights: {
            type: "array",
            items: { type: "string", enum: Object.keys(facts) },
            minItems: 2,
            maxItems: 3,
          },
        },
        required: ["highlights"],
      },
      messages: [
        {
          role: "system",
          content:
            "You are editing a concise family fuel report. Rank two or three supplied fact IDs by relevance to this household. Prioritize a budget overrun or a negative net result. Output JSON with a highlights array of unique IDs. Do not calculate numbers.",
        },
        { role: "user", content: JSON.stringify(facts) },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!result.ok) throw new Error("Model service unavailable.");
  const response = z
    .object({ message: z.object({ content: z.string().max(8000) }) })
    .parse(await result.json());
  const ids = z
    .object({ highlights: z.array(z.string()).min(2).max(3) })
    .parse(JSON.parse(response.message.content)).highlights;
  if (
    ids.some((id) => !Object.hasOwn(facts, id)) ||
    new Set(ids).size !== ids.length
  )
    throw new Error("Model returned unsupported facts.");
  return ids.map((id) => facts[id]);
}
