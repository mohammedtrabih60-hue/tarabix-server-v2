const router = require('express').Router();
const auth   = require('../middleware/auth');
const { db, msg } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

async function getTokens(schoolId, { targetUserId, classId } = {}) {
  const d = db();
  if (targetUserId) {
    const doc = await d.collection('fcm_tokens').doc(targetUserId).get();
    return doc.exists && doc.data().token ? [doc.data().token] : [];
  }
  if (classId) {
    const snap = await d.collection('students').where('schoolId','==',schoolId).where('classId','==',classId).get();
    const tokens = [];
    for (const s of snap.docs) {
      const t = await d.collection('fcm_tokens').doc(s.id).get();
      if (t.exists && t.data().token) tokens.push(t.data().token);
    }
    return tokens;
  }
  const snap = await d.collection('fcm_tokens').where('schoolId','==',schoolId).get();
  return snap.docs.map(d => d.data().token).filter(Boolean);
}

async function sendPush(tokens, title, body, data = {}) {
  if (!tokens.length) return { sent: 0 };
  try {
    const r = await msg().sendEachForMulticast({
      tokens, notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k,v]) => [k, String(v)])),
      webpush: { notification: { icon: '/icons/Icon-192.png' }, fcmOptions: { link: '/' } },
    });
    return { sent: r.successCount };
  } catch { return { sent: 0 }; }
}

// POST /api/notifications/push
router.post('/push', auth, async (req, res) => {
  try {
    const { title, body, type, targetUserId, classId } = req.body;
    if (!title) return err(res, 'missing_title', 'title required');
    const tokens = await getTokens(req.schoolId, { targetUserId, classId });
    const result = await sendPush(tokens, title, body || '', { type: type || 'general' });
    ok(res, result);
  } catch (e) { serverErr(res, e); }
});

// POST /api/notifications/register-token
router.post('/register-token', auth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return err(res, 'missing_token', 'token required');
    await db().collection('fcm_tokens').doc(req.userId).set({
      token, schoolId: req.schoolId, userId: req.userId, updatedAt: now(),
    });
    ok(res, { registered: true });
  } catch (e) { serverErr(res, e); }
});

// POST /api/notifications/teacher-note
router.post('/teacher-note', auth, async (req, res) => {
  try {
    const { studentId, studentName, noteText, isUrgent } = req.body;
    if (!studentId || !noteText) return err(res, 'missing_fields', 'studentId + noteText required');
    const id = uuid();
    await db().collection('teacher_notes').doc(id).set({
      id, type: isUrgent ? 'urgent' : 'normal',
      title: isUrgent ? '🚨 הערה דחופה' : '📝 הערה מהמורה',
      body: noteText, fromId: req.userId,
      toStudentId: studentId, toStudentName: studentName || '',
      schoolId: req.schoolId, createdAt: now(), isRead: false,
    });
    const tokens = await getTokens(req.schoolId, { targetUserId: studentId });
    if (tokens.length) await sendPush(tokens, isUrgent ? '🚨 הערה דחופה' : '📝 הערה מהמורה', noteText, { type: 'teacher_note' });
    ok(res, { sent: true, id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
