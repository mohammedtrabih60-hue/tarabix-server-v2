const router = require('express').Router();
const auth   = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('quizzes').where('schoolId', '==', req.schoolId);
    if (req.query.classId) q = q.where('classId', '==', req.query.classId);
    const snap = await q.get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

router.post('/', auth, async (req, res) => {
  try {
    const id = uuid();
    const q  = { id, ...req.body, schoolId: req.schoolId, createdBy: req.userId, createdAt: now() };
    await db().collection('quizzes').doc(id).set(q);
    ok(res, q);
  } catch (e) { serverErr(res, e); }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    await db().collection('quizzes').doc(req.params.id).update(req.body);
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db().collection('quizzes').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

router.post('/:id/submit', auth, async (req, res) => {
  try {
    const { answers, score } = req.body;
    const id = uuid();
    const attempt = {
      id, quizId: req.params.id, studentId: req.userId,
      studentName: req.body.studentName || '', answers: answers || [],
      score: score || 0, schoolId: req.schoolId, submittedAt: now(),
    };
    await db().collection('quiz_attempts').doc(id).set(attempt);
    ok(res, attempt);
  } catch (e) { serverErr(res, e); }
});

// GET /api/quizzes/attempts?studentId=
router.get('/attempts', auth, async (req, res) => {
  try {
    let q = db().collection('quiz_attempts').where('schoolId', '==', req.schoolId);
    if (req.query.studentId) q = q.where('studentId', '==', req.query.studentId);
    if (req.query.quizId)    q = q.where('quizId',    '==', req.query.quizId);
    const snap = await q.get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
