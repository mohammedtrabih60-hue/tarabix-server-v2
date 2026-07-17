const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// GET /api/classes
router.get('/', auth, async (req, res) => {
  try {
    const snap = await db().collection('classes')
      .where('schoolId', '==', req.schoolId).orderBy('name').get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

// POST /api/classes
router.post('/', auth, role('director', 'admin'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return err(res, 'missing_name', 'name required');
    const id  = uuid();
    const cls = { id, name: name.trim(), schoolId: req.schoolId, createdAt: now() };
    await db().collection('classes').doc(id).set(cls);
    ok(res, cls);
  } catch (e) { serverErr(res, e); }
});

// DELETE /api/classes/:id
router.delete('/:id', auth, role('director', 'admin'), async (req, res) => {
  try {
    await db().collection('classes').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/classes/:id/homeroom — assign homeroom teacher
router.patch('/:id/homeroom', auth, role('director', 'admin'), async (req, res) => {
  try {
    const { teacherId, teacherName, teacherPhoto, teacherPhone } = req.body;
    const updates = {
      homeroomTeacherId:    teacherId    || null,
      homeroomTeacherName:  teacherName  || '',
      homeroomTeacherPhoto: teacherPhoto || null,
      homeroomTeacherPhone: teacherPhone || null,
    };
    await db().collection('classes').doc(req.params.id).update(updates);
    ok(res, { id: req.params.id, ...updates });
  } catch (e) { serverErr(res, e); }
});

// POST /api/classes/improvement-request — student sends to homeroom
router.post('/improvement-request', auth, role('student'), async (req, res) => {
  try {
    const { subject, currentUnits, targetUnits, classId } = req.body;
    if (!subject || !classId) return err(res, 'missing_fields', 'subject + classId required');
    const d = db();
    const classDoc = await d.collection('classes').doc(classId).get();
    const homeroomId = classDoc.exists ? classDoc.data().homeroomTeacherId : null;
    const id = uuid();
    const faniya = {
      id, type: 'improvement',
      subject: `🎯 בקשת שיפור יחידות - ${subject}`,
      studentId: req.userId, studentName: req.user.name || '',
      classId, schoolId: req.schoolId,
      targetTeacherId: homeroomId || null,
      currentUnits, targetUnits,
      messages: [{
        id: uuid(), text: `הסטודנט מבקש לשפר מ-${currentUnits} ל-${targetUnits} יחידות ב${subject}`,
        isTeacher: false, senderName: req.user.name || '', sentAt: now(),
      }],
      status: 'open', createdAt: now(), updatedAt: now(),
    };
    await d.collection('faniyot').doc(id).set(faniya);
    ok(res, { faniyaId: id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
