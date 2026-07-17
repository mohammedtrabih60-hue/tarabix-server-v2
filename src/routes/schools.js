const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// GET /api/schools — admin only
router.get('/', auth, role('admin'), async (req, res) => {
  try {
    const snap = await db().collection('schools').orderBy('name').get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

// POST /api/schools — admin only
router.post('/', auth, role('admin'), async (req, res) => {
  try {
    const { name, teacherName, teacherEmail, teacherPassword, teacherPhone, location } = req.body;
    if (!name || !teacherEmail || !teacherPassword)
      return err(res, 'missing_fields', 'name, teacherEmail, teacherPassword required');

    const exists = await db().collection('schools')
      .where('teacherEmail', '==', teacherEmail.trim().toLowerCase()).limit(1).get();
    if (!exists.empty) return err(res, 'email_taken', 'Email already used');

    const id = uuid();
    const school = {
      id, name: name.trim(), teacherName: teacherName || '',
      teacherEmail: teacherEmail.trim().toLowerCase(),
      teacherPassword: teacherPassword.trim(),
      teacherPhone: teacherPhone || '',
      location: location || '', isActive: true, createdAt: now(),
    };
    await db().collection('schools').doc(id).set(school);
    ok(res, school);
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/schools/:id
router.patch('/:id', auth, role('admin', 'director'), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id; delete updates.createdAt;
    await db().collection('schools').doc(req.params.id).update(updates);
    ok(res, { id: req.params.id, ...updates });
  } catch (e) { serverErr(res, e); }
});

// DELETE /api/schools/:id
router.delete('/:id', auth, role('admin'), async (req, res) => {
  try {
    await db().collection('schools').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// POST /api/schools/:id/toggle
router.post('/:id/toggle', auth, role('admin'), async (req, res) => {
  try {
    const doc = await db().collection('schools').doc(req.params.id).get();
    const current = doc.data()?.isActive ?? true;
    await db().collection('schools').doc(req.params.id).update({ isActive: !current });
    ok(res, { id: req.params.id, isActive: !current });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
