const router = require('express').Router();
const auth   = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

router.get('/', auth, async (req, res) => {
  try {
    const snap = await db().collection('parents').where('schoolId', '==', req.schoolId).get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, email, password, phone, studentIds } = req.body;
    if (!name || !email || !password)
      return err(res, 'missing_fields', 'name, email, password required');
    const lEmail = email.trim().toLowerCase();
    const exists = await db().collection('parents').where('email', '==', lEmail).limit(1).get();
    if (!exists.empty) return err(res, 'email_taken', 'Email already used');
    const sDoc = await db().collection('schools').doc(req.schoolId).get();
    const id = uuid();
    const p  = {
      id, name: name.trim(), email: lEmail, password: password.trim(),
      phone: phone || '', studentIds: studentIds || [],
      role: 'parent', schoolId: req.schoolId,
      schoolName: sDoc.data()?.name || '', createdAt: now(),
    };
    await db().collection('parents').doc(id).set(p);
    ok(res, p);
  } catch (e) { serverErr(res, e); }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const u = { ...req.body }; delete u.id; delete u.schoolId;
    await db().collection('parents').doc(req.params.id).update(u);
    ok(res, { id: req.params.id, ...u });
  } catch (e) { serverErr(res, e); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db().collection('parents').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
