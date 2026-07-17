const router = require('express').Router();
const auth   = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('group_chat').where('schoolId', '==', req.schoolId);
    if (req.query.classId) q = q.where('classId', '==', req.query.classId);
    const snap = await q.get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse());
  } catch (e) { serverErr(res, e); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { text, classId, senderName, isTeacher, senderClassName, senderIdNumber } = req.body;
    if (!text) return err(res, 'empty_message', 'text required');
    const id  = uuid();
    const msg = {
      id, text, schoolId: req.schoolId,
      classId: classId || null,
      senderId: req.userId, senderName: senderName || '',
      isTeacher: isTeacher || false,
      senderClassName: senderClassName || null,
      senderIdNumber: senderIdNumber || null,
      sentAt: now(),
    };
    await db().collection('group_chat').doc(id).set(msg);
    ok(res, msg);
  } catch (e) { serverErr(res, e); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db().collection('group_chat').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
