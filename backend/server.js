import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import {
  extractJson, validateImage, sanitizeNameList, sanitizeAnalysisContext, validateSummary,
  sanitizeObjective, catalogNames, parseTimeoutMs, rateLimitKey,
  normalizeRecognition, normalizeBodyAnalysis, normalizeCoachAnalysis, normalizeGeneratedProgram,
} from './lib.js';

const API_KEY = process.env.NVIDIA_API_KEY;
const MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct';
const PORT = Number(process.env.PORT) || 8000;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
// Timeout appel modèle : < proxy_read_timeout nginx (90s) et < attente côté front.
const TIMEOUT_MS = parseTimeoutMs(process.env.NVIDIA_TIMEOUT_MS);

const TEXT_BODY_LIMIT = 256 * 1024; // routes texte (coach / génération)
// Rate-limit par IP et par route (les routes IA coûtent des appels NIM).
const IMAGE_RATE = { max: 12, timeWindow: '1 minute' };
const TEXT_RATE = { max: 20, timeWindow: '1 minute' };

const app = Fastify({
  bodyLimit: 8 * 1024 * 1024, // 8MB (images base64)
  trustProxy: true, // derrière nginx ; la clé de rate-limit privilégie X-Real-IP (cf. rateLimitKey)
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    // Jamais de corps, d'en-têtes, d'image, de prompt ni de sortie modèle dans les logs.
    serializers: {
      req: (req) => ({ method: req.method, url: req.url, remoteAddress: req.ip }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  },
});

await app.register(rateLimit, { max: 60, timeWindow: '1 minute', keyGenerator: rateLimitKey });

// Erreurs (JSON invalide, corps trop gros, 429…) : message générique, jamais l'entrée ni err.message
// (les erreurs de parse JSON de Node citent un extrait du corps).
const ERROR_MESSAGES = {
  400: 'Requête invalide',
  403: 'Accès refusé',
  413: 'Requête trop volumineuse',
  415: 'Type de contenu non supporté',
  429: 'Trop de tentatives, réessaie dans 1 min.',
};
app.setErrorHandler((err, req, reply) => {
  const status = err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
  if (status >= 500) req.log.error({ code: err.code, name: err.name }, 'erreur interne');
  else req.log.info({ code: err.code, status }, 'requête rejetée');
  reply.code(status).send({ error: ERROR_MESSAGES[status] || (status >= 500 ? 'Erreur interne' : 'Requête refusée') });
});
app.setNotFoundHandler((req, reply) => reply.code(404).send({ error: 'Route inconnue' }));

app.get('/health', { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } },
  async () => ({ status: 'ok', model: MODEL, keyConfigured: !!API_KEY }));

// Appel NVIDIA NIM. Retour : { content } ou { error: 502|504, upstreamStatus?, reason? }.
async function callModel(payload) {
  let res;
  try {
    res = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const timeout = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    return { error: timeout ? 504 : 502, reason: e?.name || 'fetch' };
  }
  if (!res.ok) {
    res.body?.cancel().catch(() => {}); // corps d'erreur amont jamais lu ni journalisé
    return { error: 502, upstreamStatus: res.status };
  }
  try {
    const out = await res.json();
    const content = out?.choices?.[0]?.message?.content;
    return { content: typeof content === 'string' ? content : '' };
  } catch (e) {
    const timeout = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    return { error: timeout ? 504 : 502, reason: timeout ? e.name : 'invalid_json' };
  }
}

// Réponse d'erreur modèle : on ne journalise que l'endpoint, le statut amont et le type d'erreur.
function sendModelError(req, reply, endpoint, r) {
  req.log.error({ endpoint, upstreamStatus: r.upstreamStatus, reason: r.reason }, 'NVIDIA error');
  if (r.error === 504) return reply.code(504).send({ error: 'Délai dépassé côté modèle' });
  return reply.code(502).send({ error: 'Erreur du modèle', ...(r.upstreamStatus ? { status: r.upstreamStatus } : {}) });
}

// Ordre des contrôles dans chaque route IA : validation de l'entrée (400/413) PUIS clé API (503).
// Une entrée invalide est donc rejetée même sans clé configurée.
const noKey = (reply) => reply.code(503).send({ error: 'Clé NVIDIA non configurée' });

app.post('/recognize-exercise', { config: { rateLimit: IMAGE_RATE } }, async (req, reply) => {
  const { image, allowedExercises } = req.body || {};
  const img = validateImage(image);
  if (!img.ok) return reply.code(img.status).send({ error: img.error });
  if (!API_KEY) return noKey(reply);

  const list = sanitizeNameList(allowedExercises);
  const listText = list.length ? `\nListe autorisée (utilise les noms EXACTS): ${list.join(', ')}` : '';

  const prompt =
    "Tu es un coach de musculation expert. Analyse la photo d'une machine ou d'un équipement de salle de sport. " +
    "ÉTAPE 1 (OCR) — Lis et transcris TOUT texte visible : plaque, autocollant, nom d'exercice, schéma. " +
    "ÉTAPE 2 — Identifie l'exercice. Si un nom d'exercice est lisible sur la machine, l'exercice correspondant DOIT être le candidat n°1 (ne te laisse pas tromper par la forme). " +
    "Tu disposes d'une liste d'exercices connus" + (list.length ? '' : ' (vide)') + ". " +
    "Si l'exercice correspond à un nom de la liste, utilise le nom EXACT de la liste. " +
    "Si l'exercice N'EST PAS dans la liste, propose quand même son nom réel et correct (ne force pas un mauvais mapping). " +
    "Pour CHAQUE candidat, indique le groupe musculaire principal parmi: chest, back, legs, shoulders, arms, abs. " +
    "Donne les 3 exercices les plus probables, du plus au moins probable. " +
    "Garde-fou: si la photo ne montre pas clairement une vraie machine ou un équipement de musculation (ex. logo, icône, dessin, objet ambigu), retourne isGymEquipment=false, label=null et candidates=[]. Ne déduis JAMAIS un exercice uniquement depuis la liste autorisée. Sinon retourne isGymEquipment=true. " +
    "Réponds UNIQUEMENT en JSON, sans texte autour: " +
    '{"isGymEquipment":<true|false>,"label":"<texte lu sur la machine, ou null>","candidates":[{"exercise":"<nom>","confidence":<0 à 1>,"muscleGroup":"<chest|back|legs|shoulders|arms|abs>","inList":<true si nom exact de la liste, sinon false>}]}.' +
    listText;

  const r = await callModel({
    model: MODEL,
    messages: [{ role: 'user', content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: img.dataUrl } },
    ] }],
    max_tokens: 320,
    temperature: 0.1,
  });
  if (r.error) return sendModelError(req, reply, 'recognize-exercise', r);

  return reply.send(normalizeRecognition(extractJson(r.content), list));
});

app.post('/analyze-body', { config: { rateLimit: IMAGE_RATE } }, async (req, reply) => {
  const { image, previousAnalysis } = req.body || {};
  const img = validateImage(image);
  if (!img.ok) return reply.code(img.status).send({ error: img.error });
  if (!API_KEY) return noKey(reply);

  const p = sanitizeAnalysisContext(previousAnalysis);
  const prevText = p
    ? "\nAnalyse précédente (pour mesurer l'évolution): " +
      `morphotype=${p.morphotype || '?'}, équilibre=${p.balance || '?'}, ` +
      `masse grasse=${p.bodyFatRange || '?'}, faiblesses=${p.weaknesses.join('; ') || '?'}. ` +
      "Compare et résume l'évolution visible dans 'evolutionNote'."
    : '';

  const prompt =
    "Tu es un coach sportif bienveillant. Voici une photo du corps d'une personne qui suit sa progression en musculation. " +
    "Analyse la morphologie de façon constructive et NON médicale (aucun diagnostic médical, ce sont des estimations visuelles approximatives). " +
    "Évalue: le morphotype, l'équilibre/symétrie musculaire, une fourchette approximative de masse grasse (ex '15-18%'), " +
    "les points forts visibles, les points faibles à travailler, et des conseils d'entraînement concrets. " +
    "Réponds UNIQUEMENT en JSON, sans texte autour: " +
    '{"morphotype":"<court>","balance":"<court>","bodyFatRange":"<ex 15-18%>",' +
    '"strengths":["..."],"weaknesses":["..."],"trainingAdvice":["..."],"evolutionNote":"<vide si pas de précédent>"}.' +
    prevText;

  const r = await callModel({
    model: MODEL,
    messages: [{ role: 'user', content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: img.dataUrl } },
    ] }],
    max_tokens: 512,
    temperature: 0.2,
  });
  if (r.error) return sendModelError(req, reply, 'analyze-body', r);

  const parsed = extractJson(r.content);
  if (!parsed) return reply.send({});
  return reply.send(normalizeBodyAnalysis(parsed));
});

app.post('/coach-analysis', { bodyLimit: TEXT_BODY_LIMIT, config: { rateLimit: TEXT_RATE } }, async (req, reply) => {
  const { summary, bodyAnalysis } = req.body || {};
  const s = validateSummary(summary);
  if (!s.ok) return reply.code(s.status).send({ error: s.error });
  if (!API_KEY) return noKey(reply);

  const b = sanitizeAnalysisContext(bodyAnalysis);
  const bodyText = b
    ? `\nAnalyse corporelle récente: morphotype=${b.morphotype || '?'}, faiblesses=${b.weaknesses.join('; ') || '?'}. ` +
      "Croise-la avec l'entraînement réel pour 'bodyCross'."
    : '';

  const prompt =
    "Tu es un coach de musculation. Voici un résumé chiffré de l'historique d'entraînement d'une personne (JSON). " +
    "Analyse-le et donne un bilan motivant et concret, NON médical. " +
    "Évalue: progression (exercices qui montent), plateaux (stagnation), volume hebdo, équilibre entre groupes musculaires (push/pull/jambes), et si un deload est utile. " +
    "Réponds UNIQUEMENT en JSON: " +
    '{"overview":"<2 phrases>","progression":["..."],"plateaus":["..."],"weeklyVolume":"<court>","balance":"<court>","deload":"<court>","bodyCross":"<vide si pas d\'analyse corporelle>"}. ' +
    'Résumé: ' + s.json + bodyText;

  const r = await callModel({ model: MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 700, temperature: 0.3 });
  if (r.error) return sendModelError(req, reply, 'coach-analysis', r);

  const parsed = extractJson(r.content);
  if (!parsed) return reply.send({});
  return reply.send(normalizeCoachAnalysis(parsed));
});

app.post('/generate-program', { bodyLimit: TEXT_BODY_LIMIT, config: { rateLimit: TEXT_RATE } }, async (req, reply) => {
  const { objective, catalog } = req.body || {};
  const goal = sanitizeObjective(objective);
  if (!goal) return reply.code(400).send({ error: 'objectif manquant' });
  const names = catalogNames(catalog);
  if (!names.length) return reply.code(400).send({ error: 'catalogue manquant' });
  if (!API_KEY) return noKey(reply);

  const prompt =
    "Tu es un coach de musculation. Crée un programme adapté à cet objectif: \"" + goal + "\". " +
    "Choisis 5 à 8 exercices UNIQUEMENT dans cette liste (noms EXACTS): " + names.join(', ') + ". " +
    "Pour chaque exercice donne des séries et répétitions cohérentes avec l'objectif. " +
    "Réponds UNIQUEMENT en JSON: " +
    '{"name":"<nom du programme>","exercises":[{"name":"<nom exact de la liste>","targetSets":<n>,"targetReps":<n>,"restSeconds":<s>}]}.';

  const r = await callModel({ model: MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 600, temperature: 0.4 });
  if (r.error) return sendModelError(req, reply, 'generate-program', r);

  // Noms validés contre le catalogue (cf. normalizeGeneratedProgram)
  return reply.send(normalizeGeneratedProgram(extractJson(r.content), names));
});

app.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`muscugain-ai up on :${PORT} (model ${MODEL}, timeout ${TIMEOUT_MS}ms)`))
  .catch((e) => { app.log.error(e); process.exit(1); });
