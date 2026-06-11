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

app.post('/analyze-body', async (req, reply) => {
  if (!API_KEY) return reply.code(503).send({ error: 'Clé NVIDIA non configurée' });

  const { image, previousAnalysis } = req.body || {};
  if (!image || typeof image !== 'string') return reply.code(400).send({ error: 'image manquante' });

  const dataUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;

  let prevText = '';
  if (previousAnalysis && typeof previousAnalysis === 'object') {
    const p = previousAnalysis;
    prevText =
      "\nAnalyse précédente (pour mesurer l'évolution): " +
      `morphotype=${p.morphotype || '?'}, équilibre=${p.balance || '?'}, ` +
      `masse grasse=${p.bodyFatRange || '?'}, faiblesses=${(p.weaknesses || []).join('; ') || '?'}. ` +
      "Compare et résume l'évolution visible dans 'evolutionNote'.";
  }

  const prompt =
    "Tu es un coach sportif bienveillant. Voici une photo du corps d'une personne qui suit sa progression en musculation. " +
    "Analyse la morphologie de façon constructive et NON médicale (aucun diagnostic médical, ce sont des estimations visuelles approximatives). " +
    "Évalue: le morphotype, l'équilibre/symétrie musculaire, une fourchette approximative de masse grasse (ex '15-18%'), " +
    "les points forts visibles, les points faibles à travailler, et des conseils d'entraînement concrets. " +
    "Réponds UNIQUEMENT en JSON, sans texte autour: " +
    '{"morphotype":"<court>","balance":"<court>","bodyFatRange":"<ex 15-18%>",' +
    '"strengths":["..."],"weaknesses":["..."],"trainingAdvice":["..."],"evolutionNote":"<vide si pas de précédent>"}.' +
    prevText;

  const payload = {
    model: MODEL,
    messages: [{ role: 'user', content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: dataUrl } },
    ] }],
    max_tokens: 512,
    temperature: 0.2,
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
    req.log.error({ err: String(e) }, 'NVIDIA fetch failed (body)');
    return reply.code(504).send({ error: 'Délai dépassé côté modèle' });
  }

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    req.log.error({ status: res.status, body: t.slice(0, 300) }, 'NVIDIA error (body)');
    return reply.code(502).send({ error: 'Erreur du modèle', status: res.status });
  }

  const out = await res.json();
  const content = out?.choices?.[0]?.message?.content || '';
  const parsed = extractJson(content);
  if (!parsed) return reply.send({});

  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()).slice(0, 6) : []);

  return reply.send({
    morphotype: str(parsed.morphotype),
    balance: str(parsed.balance),
    bodyFatRange: str(parsed.bodyFatRange),
    strengths: arr(parsed.strengths),
    weaknesses: arr(parsed.weaknesses),
    trainingAdvice: arr(parsed.trainingAdvice),
    evolutionNote: str(parsed.evolutionNote),
  });
});

app.post('/coach-analysis', async (req, reply) => {
  if (!API_KEY) return reply.code(503).send({ error: 'Clé NVIDIA non configurée' });
  const { summary, bodyAnalysis } = req.body || {};
  if (!summary || typeof summary !== 'object') return reply.code(400).send({ error: 'résumé manquant' });

  let bodyText = '';
  if (bodyAnalysis && typeof bodyAnalysis === 'object') {
    const b = bodyAnalysis;
    bodyText = `\nAnalyse corporelle récente: morphotype=${b.morphotype || '?'}, faiblesses=${(b.weaknesses || []).join('; ') || '?'}. ` +
      "Croise-la avec l'entraînement réel pour 'bodyCross'.";
  }

  const prompt =
    "Tu es un coach de musculation. Voici un résumé chiffré de l'historique d'entraînement d'une personne (JSON). " +
    "Analyse-le et donne un bilan motivant et concret, NON médical. " +
    "Évalue: progression (exercices qui montent), plateaux (stagnation), volume hebdo, équilibre entre groupes musculaires (push/pull/jambes), et si un deload est utile. " +
    "Réponds UNIQUEMENT en JSON: " +
    '{"overview":"<2 phrases>","progression":["..."],"plateaus":["..."],"weeklyVolume":"<court>","balance":"<court>","deload":"<court>","bodyCross":"<vide si pas d\'analyse corporelle>"}. ' +
    'Résumé: ' + JSON.stringify(summary) + bodyText;

  const payload = {
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 700,
    temperature: 0.3,
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
    req.log.error({ err: String(e) }, 'NVIDIA fetch failed (coach)');
    return reply.code(504).send({ error: 'Délai dépassé côté modèle' });
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    req.log.error({ status: res.status, body: t.slice(0, 300) }, 'NVIDIA error (coach)');
    return reply.code(502).send({ error: 'Erreur du modèle', status: res.status });
  }
  const out = await res.json();
  const parsed = extractJson(out?.choices?.[0]?.message?.content || '');
  if (!parsed) return reply.send({});
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()).slice(0, 6) : []);
  return reply.send({
    overview: str(parsed.overview), progression: arr(parsed.progression), plateaus: arr(parsed.plateaus),
    weeklyVolume: str(parsed.weeklyVolume), balance: str(parsed.balance), deload: str(parsed.deload), bodyCross: str(parsed.bodyCross),
  });
});

app.post('/generate-program', async (req, reply) => {
  if (!API_KEY) return reply.code(503).send({ error: 'Clé NVIDIA non configurée' });
  const { objective, catalog } = req.body || {};
  if (!objective || typeof objective !== 'string') return reply.code(400).send({ error: 'objectif manquant' });

  const names = catalog && typeof catalog === 'object'
    ? Object.values(catalog).flat().filter((x) => typeof x === 'string')
    : [];
  if (!names.length) return reply.code(400).send({ error: 'catalogue manquant' });

  const prompt =
    "Tu es un coach de musculation. Crée un programme adapté à cet objectif: \"" + objective.slice(0, 300) + "\". " +
    "Choisis 5 à 8 exercices UNIQUEMENT dans cette liste (noms EXACTS): " + names.join(', ') + ". " +
    "Pour chaque exercice donne des séries et répétitions cohérentes avec l'objectif. " +
    "Réponds UNIQUEMENT en JSON: " +
    '{"name":"<nom du programme>","exercises":[{"name":"<nom exact de la liste>","targetSets":<n>,"targetReps":<n>,"restSeconds":<s>}]}.';

  const payload = { model: MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 600, temperature: 0.4 };
  let res;
  try {
    res = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    });
  } catch (e) {
    req.log.error({ err: String(e) }, 'NVIDIA fetch failed (generate)');
    return reply.code(504).send({ error: 'Délai dépassé côté modèle' });
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    req.log.error({ status: res.status, body: t.slice(0, 300) }, 'NVIDIA error (generate)');
    return reply.code(502).send({ error: 'Erreur du modèle', status: res.status });
  }
  const out = await res.json();
  const parsed = extractJson(out?.choices?.[0]?.message?.content || '');
  if (!parsed) return reply.send({ name: '', exercises: [] });
  // Validation des noms contre le catalogue
  const valid = new Set(names);
  const exercises = Array.isArray(parsed.exercises) ? parsed.exercises
    .filter((e) => e && valid.has(String(e.name).trim()))
    .map((e) => ({
      name: String(e.name).trim(),
      targetSets: Math.max(1, parseInt(e.targetSets) || 3),
      targetReps: Math.max(1, parseInt(e.targetReps) || 10),
      ...(parseInt(e.restSeconds) > 0 ? { restSeconds: parseInt(e.restSeconds) } : {}),
    })).slice(0, 12) : [];
  return reply.send({ name: typeof parsed.name === 'string' ? parsed.name.trim() : '', exercises });
});

app.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`muscugain-ai up on :${PORT} (model ${MODEL})`))
  .catch((e) => { app.log.error(e); process.exit(1); });
