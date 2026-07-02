export const config = { path: "/api/analyze" };

export default async (req) => {
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return json(500, {
      error: "Missing OPENAI_API_KEY. Add it in Netlify's environment variables."
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON request body." });
  }

  const conditions = Array.isArray(body.conditions) ? body.conditions : [];
  const profile = body.profile && typeof body.profile === "object" ? body.profile : null;
  const nutritionContext =
    body.nutritionContext && typeof body.nutritionContext === "object"
      ? body.nutritionContext
      : null;

  if (conditions.length === 0) {
    return json(400, { error: "No conditions were provided." });
  }

  try {
    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  "You are helping summarize symptom overlap and possible diet considerations for multiple serious health conditions. You may receive structured nutrition diet data (DASH, Mediterranean, Healthy Vegetarian, Pescetarian, Semi-Vegetarian, Keto, Blood Type) that is reference material for clinician discussion, not verified medical advice. Do not diagnose. Do not claim a treatment plan is medically correct. When Blood Type guidance appears, treat it as a discussion guide with mixed evidence. Produce cautious, structured guidance meant for discussion with a clinician. Return strict JSON with keys: summary, dietConsiderations, clinicianQuestions, safetyNotes. summary must be a string. The other keys must be arrays of short strings."
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify(
                  {
                    task:
                      "Summarize overlapping symptoms and possible shared diet considerations for clinician review.",
                    conditions,
                    profile,
                    nutritionContext
                  },
                  null,
                  2
                )
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "condition_overlap_summary",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: { type: "string" },
                dietConsiderations: { type: "array", items: { type: "string" } },
                clinicianQuestions: { type: "array", items: { type: "string" } },
                safetyNotes: { type: "array", items: { type: "string" } }
              },
              required: [
                "summary",
                "dietConsiderations",
                "clinicianQuestions",
                "safetyNotes"
              ]
            }
          }
        }
      })
    });

    const payload = await apiResponse.json();

    if (!apiResponse.ok) {
      return json(apiResponse.status, {
        error: payload.error?.message || "OpenAI request failed."
      });
    }

    const analysis = extractAnalysis(payload);

    if (!analysis) {
      return json(502, { error: "The AI service returned an empty response." });
    }

    return json(200, { analysis });
  } catch (error) {
    return json(500, { error: error.message || "Unexpected server error." });
  }
};

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

function extractAnalysis(payload) {
  if (payload.output_parsed && typeof payload.output_parsed === "object") {
    return payload.output_parsed;
  }

  const text = extractResponseText(payload);

  if (text) {
    return JSON.parse(text);
  }

  if (!Array.isArray(payload.output)) {
    return null;
  }

  for (const item of payload.output) {
    if (!Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (content.parsed && typeof content.parsed === "object") {
        return content.parsed;
      }

      if (content.json && typeof content.json === "object") {
        return content.json;
      }
    }
  }

  return null;
}

function extractResponseText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) {
    return "";
  }

  for (const item of payload.output) {
    if (!Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (typeof content.text === "string" && content.text.trim()) {
        return content.text;
      }
    }
  }

  return "";
}
