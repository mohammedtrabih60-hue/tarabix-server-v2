const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('messages').where('schoolId', '==', req.schoolId);
    const snap = await q.get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

router.post('/', auth, role('director', 'teacher', 'admin'), async (req, res) => {
  try {
    const { subject, content, recipientId, classId } = req.body;
    if (!subject || !content) return err(res, 'missing_fields', 'subject + content required');
    const id = uuid();
    const msg = {
      id, subject, content, schoolId: req.schoolId,
      sentBy: req.userId, sentAt: now(),
      recipientId: recipientId || null,
      classId: recipientId ? null : (classId || null),
      readBy: {},
    };
    await db().collection('messages').doc(id).set(msg);
    ok(res, msg);
  } catch (e) { serverErr(res, e); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db().collection('messages').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/messages/:id/read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await db().collection('messages').doc(req.params.id)
      .update({ [`readBy.${req.userId}`]: true });
    ok(res, { read: true });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
