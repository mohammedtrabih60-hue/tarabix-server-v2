const router = require('express').Router();
const auth   = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// GET /api/millionaire/questions
router.get('/questions', auth, async (req, res) => {
  try {
    let q = db().collection('millionaire_questions').where('schoolId', '==', req.schoolId);
    if (req.query.subject) q = q.where('subject', '==', req.query.subject);
    const snap = await q.get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

// POST /api/millionaire/questions
router.post('/questions', auth, async (req, res) => {
  try {
    const id = uuid();
    const q  = { id, ...req.body, schoolId: req.schoolId, createdBy: req.userId, createdAt: now() };
    await db().collection('millionaire_questions').doc(id).set(q);
    ok(res, q);
  } catch (e) { serverErr(res, e); }
});

// POST /api/millionaire/score — save game score
router.post('/score', auth, async (req, res) => {
  try {
    const { score, level, subject } = req.body;
    const id = uuid();
    const record = {
      id, studentId: req.userId, schoolId: req.schoolId,
      score: Number(score || 0), level: Number(level || 0),
      subject: subject || '', playedAt: now(),
    };
    await db().collection('millionaire_scores').doc(id).set(record);
    // Award points based on score
    if (score > 0) {
      const pts = Math.floor(score / 100);
      if (pts > 0) {
        await db().collection('students').doc(req.userId)
          .update({ totalPoints: require('firebase-admin').firestore.FieldValue.increment(pts) });
      }
    }
    ok(res, record);
  } catch (e) { serverErr(res, e); }
});

// GET /api/millionaire/leaderboard
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const snap = await db().collection('millionaire_scores')
      .where('schoolId', '==', req.schoolId)
      .get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
