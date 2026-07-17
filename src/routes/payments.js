const router = require('express').Router();
const auth   = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('payments').where('schoolId', '==', req.schoolId);
    if (req.query.studentId) q = q.where('studentId', '==', req.query.studentId);
    const snap = await q.orderBy('createdAt', 'desc').get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

router.post('/', auth, async (req, res) => {
  try {
    const id = uuid();
    const p  = { id, ...req.body, schoolId: req.schoolId, createdBy: req.userId, createdAt: now(), isPaid: false };
    await db().collection('payments').doc(id).set(p);
    ok(res, p);
  } catch (e) { serverErr(res, e); }
});

router.patch('/:id/pay', auth, async (req, res) => {
  try {
    await db().collection('payments').doc(req.params.id).update({ isPaid: true, paidAt: now() });
    ok(res, { id: req.params.id, isPaid: true });
  } catch (e) { serverErr(res, e); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db().collection('payments').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
