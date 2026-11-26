const SAMPLE = {
  summary: "Updated the hours line in the sample copy. This is a dry-run patch, not a live edit.",
  files: [{ path: "clinics/sample/index.html", content: "<!-- dry-run patch placeholder -->" }],
};

export function samplePatch() {
  return { ...SAMPLE, files: SAMPLE.files.map((file) => ({ ...file })) };
}

export async function requestPatch({ provider = "gemini", apiKey, apiUrl, model, requestText, siteFiles, fetchImpl = fetch }) {
  if (!apiKey) return samplePatch();
  const prompt = [
    "You edit a static website. Most of the work is AI. Return JSON only:",
    '{"summary":"one sentence","files":[{"path":"relative","content":"full file"}]}',
    "Do not invent testimonials, ratings, or statistics. Do not add accessibility-compliance claims.",
    "Do not include patient health information.",
    `Request: ${requestText}`,
    `Current files: ${JSON.stringify(siteFiles || []).slice(0, 12000)}`,
  ].join("\n");

  if (provider === "workers-ai") {
    throw new Error("workers-ai is called from the Worker binding, not this HTTP helper");
  }

  const endpoint = provider === "gemini"
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-2.0-flash"}:generateContent?key=${apiKey}`
    : apiUrl;
  const body = provider === "gemini"
    ? { contents: [{ parts: [{ text: prompt }] }] }
    : { model: model || "gpt-4o-mini", messages: [{ role: "user", content: prompt }] };

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(provider === "gemini" ? {} : { authorization: `Bearer ${apiKey}` }),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`LLM HTTP ${response.status}`);
  const data = await response.json();
  const text = provider === "gemini"
    ? data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n")
    : data.choices?.[0]?.message?.content;
  const jsonStart = String(text || "").indexOf("{");
  const jsonEnd = String(text || "").lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < jsonStart) throw new Error("LLM did not return JSON");
  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  if (!parsed.summary || !Array.isArray(parsed.files)) throw new Error("LLM patch missing summary or files");
  return parsed;
}
