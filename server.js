const http = require("http");
const fs = require("fs");
const path = require("path");

loadEnvFile();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && req.url === "/api/analyze") {
    await handleAnalyze(req, res);
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  serveStaticFile(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`ComboDiet running at http://${HOST}:${PORT}`);
});

async function handleAnalyze(req, res) {
  if (!OPENAI_API_KEY) {
    sendJson(res, 500, {
      error: "Missing OPENAI_API_KEY. Add it to your environment before starting the server."
    });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const conditions = Array.isArray(body.conditions) ? body.conditions : [];
    const profile = body.profile && typeof body.profile === "object" ? body.profile : null;
    const nutritionContext =
      body.nutritionContext && typeof body.nutritionContext === "object"
        ? body.nutritionContext
        : null;

    if (conditions.length === 0) {
      sendJson(res, 400, { error: "No conditions were provided." });
      return;
    }

    const prompt = buildPrompt(conditions, profile, nutritionContext);
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
                  "You are helping summarize symptom overlap and possible diet considerations for multiple serious health conditions. You may receive structured nutrition framework data (DASH, Mediterranean, Healthy Vegetarian, Pescetarian, Semi-Vegetarian, Keto, Blood Type) that is reference material for clinician discussion, not verified medical advice. Do not diagnose. Do not claim a treatment plan is medically correct. When Blood Type guidance appears, treat it as a discussion framework with mixed evidence. Produce cautious, structured guidance meant for discussion with a clinician. Return strict JSON with keys: summary, dietConsiderations, clinicianQuestions, safetyNotes. summary must be a string. The other keys must be arrays of short strings."
              }
            ]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: prompt }]
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
                dietConsiderations: {
                  type: "array",
                  items: { type: "string" }
                },
                clinicianQuestions: {
                  type: "array",
                  items: { type: "string" }
                },
                safetyNotes: {
                  type: "array",
                  items: { type: "string" }
                }
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
      sendJson(res, apiResponse.status, {
        error: payload.error?.message || "OpenAI request failed."
      });
      return;
    }

    const analysis = extractAnalysis(payload);

    if (!analysis) {
      sendJson(res, 502, {
        error: "The AI service returned an empty response."
      });
      return;
    }
    sendJson(res, 200, { analysis });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Unexpected server error."
    });
  }
}

function buildPrompt(conditions, profile, nutritionContext) {
  return JSON.stringify(
    {
      task:
        "Summarize overlapping symptoms and possible shared diet considerations for clinician review.",
      conditions,
      profile,
      nutritionContext
    },
    null,
    2
  );
}

function serveStaticFile(req, res) {
  const requestedPath = req.url === "/" ? "/index.html" : req.url;
  const safePath = path.normalize(path.join(ROOT, requestedPath));

  if (!safePath.startsWith(ROOT)) {
    sendJson(res, 403, { error: "Forbidden." });
    return;
  }

  fs.readFile(safePath, (error, data) => {
    if (error) {
      sendJson(res, 404, { error: "Not found." });
      return;
    }

    const ext = path.extname(safePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream"
    });
    res.end(data);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error("Invalid JSON request body."));
      }
    });

    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
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

      if (content.type === "output_text" && typeof content.text === "string" && content.text.trim()) {
        return content.text;
      }
    }
  }

  return "";
}

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, "utf8");

  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  });
}
