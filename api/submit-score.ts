// Simple in-memory store (resets when serverless function sleeps)
type SubmitScoreBody = {
  name: string;
  score: number;
};

type VercelRequest<TBody = unknown> = {
  method?: string;
  body: TBody;
};

type VercelResponse = {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
};

type ScoreEntry = SubmitScoreBody & {
  timestamp: number;
};

let scores: ScoreEntry[] = [];

export default async function handler(
  req: VercelRequest<Partial<SubmitScoreBody>>,
  res: VercelResponse
) {
  if (req.method === "POST") {
    try {
      const { name, score } = req.body;

      if (!name || typeof score !== "number") {
        return res.status(400).json({ error: "Invalid payload" });
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
