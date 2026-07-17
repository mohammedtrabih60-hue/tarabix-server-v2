const router = require('express').Router();
const auth   = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

router.get('/', auth, async (req, res) => {
  try {
    const snap = await db().collection('faniyot')
      .where('schoolId', '==', req.schoolId)
      .orderBy('createdAt', 'desc').limit(200).get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

router.post('/', auth, async (req, res) => {
  try {
    const id = uuid();
    const t  = now();
    const f  = {
      id, ...req.body, schoolId: req.schoolId,
      status: req.body.status || 'open',
      messages: req.body.messages || [],
      createdAt: t, updatedAt: t,
    };
    await db().collection('faniyot').doc(id).set(f);
    ok(res, f);
  } catch (e) { serverErr(res, e); }
});

router.post('/:id/message', auth, async (req, res) => {
  try {
    const { text, isTeacher, senderName, mediaBase64, mediaFileName, mediaMimeType } = req.body;
    if (!text && !mediaBase64) return err(res, 'empty_message', 'text or media required');
    const msg = {
      id: uuid(), text: text || '', isTeacher: isTeacher || false,
      senderName: senderName || req.user?.name || '',
      mediaBase64: mediaBase64 || null,
      mediaFileName: mediaFileName || null,
      mediaMimeType: mediaMimeType || null,
      sentAt: now(),
    };
    const ref  = db().collection('faniyot').doc(req.params.id);
    const doc  = await ref.get();
    if (!doc.exists) return err(res, 'not_found', 'Faniya not found', 404);
    const msgs = [...(doc.data().messages || []), msg];
    await ref.update({ messages: msgs, updatedAt: now() });
    ok(res, msg);
  } catch (e) { serverErr(res, e); }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    await db().collection('faniyot').doc(req.params.id)
      .update({ status, updatedAt: now() });
    ok(res, { id: req.params.id, status });
  } catch (e) { serverErr(res, e); }
});

router.patch('/:id/transfer', auth, async (req, res) => {
  try {
    const { toTeacherId, toTeacherName } = req.body;
    await db().collection('faniyot').doc(req.params.id)
      .update({ transferredToTeacherId: toTeacherId, transferredToTeacherName: toTeacherName, updatedAt: now() });
    ok(res, { transferred: true });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
