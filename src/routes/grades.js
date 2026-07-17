const router = require('express').Router();
const auth   = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('grades').where('schoolId', '==', req.schoolId);
    if (req.query.studentId) q = q.where('studentId', '==', req.query.studentId);
    if (req.query.classId)   q = q.where('classId',   '==', req.query.classId);
    if (req.query.subject)   q = q.where('subject',   '==', req.query.subject);
    const snap = await q.get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { studentId, subject, title, score, maxScore, classId, date, type } = req.body;
    if (!studentId || !subject || score === undefined)
      return err(res, 'missing_fields', 'studentId, subject, score required');
    const id = uuid();
    const g  = {
      id, studentId, subject, title: title || subject,
      score: Number(score), maxScore: Number(maxScore || 100),
      percentage: (Number(score) / Number(maxScore || 100)) * 100,
      classId: classId || '', schoolId: req.schoolId,
      teacherId: req.userId, date: date || now(), type: type || 'exam',
      createdAt: now(),
    };
    await db().collection('grades').doc(id).set(g);
    ok(res, g);
  } catch (e) { serverErr(res, e); }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const u = { ...req.body };
    if (u.score !== undefined && u.maxScore !== undefined)
      u.percentage = (Number(u.score) / Number(u.maxScore)) * 100;
    await db().collection('grades').doc(req.params.id).update(u);
    ok(res, { id: req.params.id, ...u });
  } catch (e) { serverErr(res, e); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db().collection('grades').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
