import { getEnv } from "./env";

export function hasNvidia(): boolean {
  return Boolean(getEnv().nvidiaApiKey);
}

/** Chat completion via NVIDIA NIM — plain fetch, no OpenAI SDK. */
export async function nvidiaChatCompletion(opts: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const { nvidiaApiKey, nvidiaBaseUrl, nvidiaModel } = getEnv();
  if (!nvidiaApiKey) {
    throw new Error("NVIDIA_API_KEY is not set");
  }

  const res = await fetch(`${nvidiaBaseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${nvidiaApiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: nvidiaModel,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 220,
      stream: false,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NVIDIA API failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "{}";
}
