const router = require('express').Router();
const auth   = require('../middleware/auth');
const { ok, err, serverErr } = require('../utils/helpers');

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  const { OpenAI } = require('openai');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function callAI(systemPrompt, userMessage, history = []) {
  const ai = getOpenAI();
  if (!ai) return 'AI not configured. Please set OPENAI_API_KEY.';
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-12).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ];
  const r = await ai.chat.completions.create({ model: 'gpt-4o-mini', messages, max_tokens: 1200 });
  return r.choices[0].message.content;
}

// POST /api/ai/chat
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, subject, history, sessionId } = req.body;
    if (!message) return err(res, 'no_message', 'message required');
    const system = subject
      ? `You are a helpful educational assistant specializing in ${subject}. Answer in the same language the student uses (Hebrew or Arabic). Be encouraging and clear.`
      : `You are a helpful educational assistant for students. Answer in the same language the student uses. Be concise and clear.`;
    const reply = await callAI(system, message, history || []);
    ok(res, { reply, sessionId: sessionId || require('../utils/helpers').uuid() });
  } catch (e) { serverErr(res, e); }
});

// POST /api/ai/solve
router.post('/solve', auth, async (req, res) => {
  try {
    const { problem } = req.body;
    if (!problem) return err(res, 'no_problem', 'problem required');
    const reply = await callAI(
      'You are a math/science tutor. Solve the problem step by step. Show all work clearly. Use the same language as the student.',
      problem
    );
    ok(res, { reply });
  } catch (e) { serverErr(res, e); }
});

// POST /api/ai/explain
router.post('/explain', auth, async (req, res) => {
  try {
    const { concept, level } = req.body;
    if (!concept) return err(res, 'no_concept', 'concept required');
    const reply = await callAI(
      `You are a teacher. Explain the concept clearly for a ${level || 'high school'} student. Use simple language and give examples. Answer in the same language as the student.`,
      concept
    );
    ok(res, { reply });
  } catch (e) { serverErr(res, e); }
});

// POST /api/ai/career
router.post('/career', auth, async (req, res) => {
  try {
    const { interests, grades, question } = req.body;
    const context = interests ? `Student interests: ${interests}. Grade average: ${grades || 'unknown'}.` : '';
    const reply = await callAI(
      `You are a career counselor for students. ${context} Give practical, encouraging advice. Answer in the same language.`,
      question || 'What career paths would suit me?'
    );
    ok(res, { reply });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
