const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

router.get('/', auth, async (req, res) => {
  try {
    const snap = await db().collection('teacher_accounts')
      .where('schoolId', '==', req.schoolId).get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

router.post('/', auth, role('director', 'admin'), async (req, res) => {
  try {
    const { name, email, password, allowedClassIds, phone } = req.body;
    if (!name || !email || !password)
      return err(res, 'missing_fields', 'name, email, password required');
    const lEmail = email.trim().toLowerCase();
    const exists = await db().collection('teacher_accounts').where('email', '==', lEmail).limit(1).get();
    if (!exists.empty) return err(res, 'email_taken', 'Email already used');
    const id = uuid();
    const t  = {
      id, name: name.trim(), email: lEmail, password: password.trim(),
      phone: phone || '', allowedClassIds: allowedClassIds || [],
      schoolId: req.schoolId, isActive: true, createdAt: now(),
    };
    await db().collection('teacher_accounts').doc(id).set(t);
    ok(res, t);
  } catch (e) { serverErr(res, e); }
});

router.patch('/:id', auth, role('director', 'admin'), async (req, res) => {
  try {
    const u = { ...req.body }; delete u.id; delete u.schoolId; delete u.createdAt;
    await db().collection('teacher_accounts').doc(req.params.id).update(u);
    ok(res, { id: req.params.id, ...u });
  } catch (e) { serverErr(res, e); }
});

router.delete('/:id', auth, role('director', 'admin'), async (req, res) => {
  try {
    await db().collection('teacher_accounts').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
