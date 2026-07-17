const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('schedule').where('schoolId', '==', req.schoolId);
    if (req.query.classId) q = q.where('classId', '==', req.query.classId);
    const snap = await q.get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

router.post('/', auth, role('director', 'teacher', 'admin'), async (req, res) => {
  try {
    const { subject, dayOfWeek, startTime, endTime, classId, room } = req.body;
    if (!subject || dayOfWeek === undefined || !startTime || !endTime)
      return err(res, 'missing_fields', 'subject, dayOfWeek, startTime, endTime required');
    const id  = uuid();
    const doc = {
      id, subject, dayOfWeek: Number(dayOfWeek), startTime, endTime,
      classId: classId || '', room: room || null,
      schoolId: req.schoolId, createdBy: req.userId, createdAt: now(),
    };
    await db().collection('schedule').doc(id).set(doc);
    ok(res, doc);
  } catch (e) { serverErr(res, e); }
});

router.delete('/:id', auth, role('director', 'teacher', 'admin'), async (req, res) => {
  try {
    await db().collection('schedule').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
