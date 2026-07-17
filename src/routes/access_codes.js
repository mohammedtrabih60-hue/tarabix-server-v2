const router = require('express').Router();
const auth   = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// GET /api/access-codes
router.get('/', auth, async (req, res) => {
  try {
    const snap = await db().collection('access_codes').where('schoolId', '==', req.schoolId).get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

// POST /api/access-codes — generate new code
router.post('/', auth, async (req, res) => {
  try {
    const id   = uuid();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const ac   = {
      id, code, ...req.body, schoolId: req.schoolId,
      createdBy: req.userId, createdAt: now(), isUsed: false,
    };
    await db().collection('access_codes').doc(id).set(ac);
    ok(res, ac);
  } catch (e) { serverErr(res, e); }
});

// POST /api/access-codes/verify
router.post('/verify', auth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return err(res, 'missing_code', 'code required');
    const snap = await db().collection('access_codes')
      .where('code', '==', code.toUpperCase())
      .where('schoolId', '==', req.schoolId)
      .where('isUsed', '==', false).limit(1).get();
    if (snap.empty) return err(res, 'invalid_code', 'Code not found or already used', 404);
    const ac = { id: snap.docs[0].id, ...snap.docs[0].data() };
    await db().collection('access_codes').doc(ac.id).update({ isUsed: true, usedBy: req.userId, usedAt: now() });
    ok(res, { valid: true, code: ac });
  } catch (e) { serverErr(res, e); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db().collection('access_codes').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
