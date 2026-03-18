// Simple in-memory store (resets when serverless function sleeps)
type SubmitScoreBody = {
  name: string;
  score: number;
};

type VercelRequest<TBody = unknown> = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body: TBody;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
};

type ScoreEntry = SubmitScoreBody & {
  timestamp: number;
};

let scores: ScoreEntry[] = [];
const MAX_SCORE = 10000;

const VERCEL_SUBDOMAIN_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i;
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const FILE_ORIGIN = "null";

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    // Allow non-browser/server-to-server calls that do not send an Origin header.
    return true;
  }

  return (
    origin === FILE_ORIGIN ||
    VERCEL_SUBDOMAIN_ORIGIN.test(origin) ||
    LOCALHOST_ORIGIN.test(origin)
  );
}

function getOrigin(req: VercelRequest): string | undefined {
  const originHeader = req.headers?.origin;

  if (Array.isArray(originHeader)) {
    return originHeader[0];
  }

  return originHeader;
}

function setCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = getOrigin(req);

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

export default async function handler(
  req: VercelRequest<Partial<SubmitScoreBody>>,
  res: VercelResponse
) {
  setCorsHeaders(req, res);

  const origin = getOrigin(req);

  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  if (req.method === "OPTIONS") {
    return res.status(200).json({ success: true });
  }

  if (req.method === "POST") {
    try {
      const { name, score } = req.body ?? {};

      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          error: "Invalid payload: 'name' is required and must be a non-empty string"
        });
      }

      if (typeof score !== "number" || !Number.isFinite(score)) {
        return res.status(400).json({
          error: "Invalid payload: 'score' must be a finite number"
        });
      }

      if (score > MAX_SCORE) {
        return res.status(400).json({
          error: `Invalid payload: 'score' cannot exceed ${MAX_SCORE}. Received ${score}`
        });
      }

      const entry: ScoreEntry = {
        name,
        score,
        timestamp: Date.now()
      };

      scores.push(entry);

      return res.status(200).json({ success: true, entry });
    } catch (err) {
      return res.status(500).json({ error: "Server error" });
    }
  }

  if (req.method === "GET") {
    // Optional: return all scores
    return res.status(200).json(scores);
  }

  if (req.method === "DELETE") {
    scores = [];
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
