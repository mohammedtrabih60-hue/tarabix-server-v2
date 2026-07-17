const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('announcements').where('schoolId', '==', req.schoolId);
    if (req.query.classId) q = q.where('classId', '==', req.query.classId);
    const snap = await q.orderBy('createdAt', 'desc').limit(100).get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

router.post('/', auth, role('director', 'teacher', 'admin'), async (req, res) => {
  try {
    const { title, body, type, classId } = req.body;
    if (!title || !body) return err(res, 'missing_fields', 'title + body required');
    const id = uuid();
    const ann = {
      id, title, body, type: type || 'general',
      schoolId: req.schoolId, classId: classId || null,
      createdBy: req.userId, createdAt: now(), readBy: {},
    };
    await db().collection('announcements').doc(id).set(ann);
    ok(res, ann);
  } catch (e) { serverErr(res, e); }
});

router.delete('/:id', auth, role('director', 'teacher', 'admin'), async (req, res) => {
  try {
    await db().collection('announcements').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
