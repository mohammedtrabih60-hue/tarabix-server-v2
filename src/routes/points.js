const router = require('express').Router();
const auth   = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');
const admin = require('firebase-admin');

router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('points').where('schoolId', '==', req.schoolId);
    if (req.query.studentId) q = q.where('studentId', '==', req.query.studentId);
    const snap = await q.orderBy('createdAt', 'desc').limit(200).get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

router.post('/award', auth, async (req, res) => {
  try {
    const { studentId, points, reason, type } = req.body;
    if (!studentId || !points) return err(res, 'missing_fields', 'studentId + points required');
    const id     = uuid();
    const record = { id, studentId, points: Number(points), reason: reason || '', type: type || 'general', schoolId: req.schoolId, awardedBy: req.userId, createdAt: now() };
    const stuRef = db().collection('students').doc(studentId);
    await Promise.all([
      db().collection('points').doc(id).set(record),
      stuRef.update({ totalPoints: admin.firestore.FieldValue.increment(Number(points)) }),
    ]);
    ok(res, record);
  } catch (e) { serverErr(res, e); }
});

router.post('/deduct', auth, async (req, res) => {
  try {
    const { studentId, points, reason } = req.body;
    if (!studentId || !points) return err(res, 'missing_fields', 'studentId + points required');
    await db().collection('students').doc(studentId)
      .update({ totalPoints: admin.firestore.FieldValue.increment(-Number(points)) });
    ok(res, { deducted: Number(points) });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
