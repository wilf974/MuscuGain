import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';

const API_KEY = process.env.NVIDIA_API_KEY;
const MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-nano-12b-v2-vl';
const PORT = Number(process.env.PORT) || 8000;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

const app = Fastify({ logger: true, bodyLimit: 8 * 1024 * 1024 }); // 8MB (base64 images)

await app.register(rateLimit, { max: 30, timeWindow: '1 minute' });

app.get('/health', async () => ({ status: 'ok', model: MODEL, keyConfigured: !!API_KEY }));

// Extrait le premier objet JSON d'une réponse (les modèles ajoutent parfois du texte/```).
function extractJson(text) {
  const m = text && text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

app.post('/recognize-exercise', async (req, reply) => {
  if (!API_KEY) return reply.code(503).send({ error: 'Clé NVIDIA non configurée' });

  const { image, allowedExercises } = req.body || {};
  if (!image || typeof image !== 'string') return reply.code(400).send({ error: 'image manquante' });

  const list = Array.isArray(allowedExercises) && allowedExercises.length ? allowedExercises : null;
  const dataUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
  const listText = list ? `\nListe autorisée (utilise les noms EXACTS): ${list.join(', ')}` : '';

  const prompt =
    "Tu es coach de musculation. Voici la photo d'une machine de salle de sport. " +
    "PRIORITÉ ABSOLUE: lis toute plaque, étiquette ou nom d'exercice écrit sur la machine et sers-t'en pour identifier l'exercice. " +
    "Sinon, déduis-le de la forme de la machine. " +
    "Donne les 3 exercices les plus probables, du plus probable au moins probable. " +
    "Réponds UNIQUEMENT en JSON, sans texte autour: " +
    '{"label": "<texte d\'exercice lu sur la machine, ou null>", "candidates": [{"exercise": "<nom>", "confidence": <0 à 1>}]}.' +
    listText;

  const payload = {
    model: MODEL,
    messages: [{ role: 'user', content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: dataUrl } },
    ] }],
    max_tokens: 256,
    temperature: 0.1,
  };

  let res;
  try {
    res = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    });
  } catch (e) {
    req.log.error({ err: String(e) }, 'NVIDIA fetch failed');
    return reply.code(504).send({ error: "Délai dépassé côté modèle" });
  }

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    req.log.error({ status: res.status, body: t.slice(0, 300) }, 'NVIDIA error');
    return reply.code(502).send({ error: 'Erreur du modèle', status: res.status });
  }

  const out = await res.json();
  const content = out?.choices?.[0]?.message?.content || '';
  const parsed = extractJson(content);
  if (!parsed) return reply.send({ label: null, candidates: [] });

  let candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
  candidates = candidates
    .filter((c) => c && c.exercise)
    .map((c) => ({ exercise: String(c.exercise).trim(), confidence: Number(c.confidence) || null }))
    .slice(0, 3);

  return reply.send({ label: parsed.label ?? null, candidates });
});

app.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`muscugain-ai up on :${PORT} (model ${MODEL})`))
  .catch((e) => { app.log.error(e); process.exit(1); });
