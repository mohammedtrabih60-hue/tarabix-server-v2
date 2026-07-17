const router = require('express').Router();
const auth   = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('certificates').where('schoolId', '==', req.schoolId);
    if (req.query.studentId) q = q.where('studentId', '==', req.query.studentId);
    const snap = await q.orderBy('issuedAt', 'desc').get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

router.post('/', auth, async (req, res) => {
  try {
    const id   = uuid();
    const cert = { id, ...req.body, schoolId: req.schoolId, issuedBy: req.userId, issuedAt: now() };
    await db().collection('certificates').doc(id).set(cert);
    ok(res, cert);
  } catch (e) { serverErr(res, e); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db().collection('certificates').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
