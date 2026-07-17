const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// GET /api/students
router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('students').where('schoolId', '==', req.schoolId);
    if (req.query.classId) q = q.where('classId', '==', req.query.classId);
    if (req.query.status)  q = q.where('status',  '==', req.query.status);
    const snap = await q.get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

// GET /api/students/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await db().collection('students').doc(req.params.id).get();
    if (!doc.exists) return err(res, 'not_found', 'Student not found', 404);
    ok(res, { id: doc.id, ...doc.data() });
  } catch (e) { serverErr(res, e); }
});

// POST /api/students — add student
router.post('/', auth, role('director', 'teacher', 'admin'), async (req, res) => {
  try {
    const { name, email, password, classId, className, phone, idNumber } = req.body;
    if (!name || !email || !password)
      return err(res, 'missing_fields', 'name, email, password required');

    const lEmail = email.trim().toLowerCase();
    const exists = await db().collection('students').where('email', '==', lEmail).limit(1).get();
    if (!exists.empty) return err(res, 'email_taken', 'Email already used');

    const sDoc = await db().collection('schools').doc(req.schoolId).get();
    const id  = uuid();
    const stu = {
      id, name: name.trim(), email: lEmail, password: password.trim(),
      role: 'student', status: 'approved',
      schoolId: req.schoolId, schoolName: sDoc.data()?.name || '',
      classId: classId || '', className: className || '',
      phone: phone || '', idNumber: idNumber || '',
      profileImageBase64: null, totalPoints: 0,
      joinedAt: now(), createdAt: now(), createdBy: req.userId,
    };
    await db().collection('students').doc(id).set(stu);
    ok(res, stu);
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/students/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const u = { ...req.body };
    delete u.id; delete u.role; delete u.schoolId; delete u.createdAt;
    await db().collection('students').doc(req.params.id).update(u);
    ok(res, { id: req.params.id, ...u });
  } catch (e) { serverErr(res, e); }
});

// DELETE /api/students/:id
router.delete('/:id', auth, role('director', 'teacher', 'admin'), async (req, res) => {
  try {
    const d   = db();
    const bat = d.batch();
    bat.delete(d.collection('students').doc(req.params.id));
    // Delete related grades
    const grades = await d.collection('grades').where('studentId', '==', req.params.id).get();
    grades.docs.forEach(g => bat.delete(g.ref));
    await bat.commit();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// POST /api/students/:id/approve
router.post('/:id/approve', auth, role('director', 'teacher', 'admin'), async (req, res) => {
  try {
    await db().collection('students').doc(req.params.id).update({ status: 'approved' });
    ok(res, { id: req.params.id, status: 'approved' });
  } catch (e) { serverErr(res, e); }
});

// POST /api/students/:id/reject
router.post('/:id/reject', auth, role('director', 'teacher', 'admin'), async (req, res) => {
  try {
    await db().collection('students').doc(req.params.id).update({ status: 'rejected' });
    ok(res, { id: req.params.id, status: 'rejected' });
  } catch (e) { serverErr(res, e); }
});

// POST /api/students/:id/reset-password
router.post('/:id/reset-password', auth, role('director', 'teacher', 'admin'), async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return err(res, 'missing_password', 'password required');
    await db().collection('students').doc(req.params.id).update({ password: password.trim() });
    ok(res, { id: req.params.id, reset: true });
  } catch (e) { serverErr(res, e); }
});

// POST /api/students/update-profile — any logged user updates own profile
router.post('/update-profile', auth, async (req, res) => {
  try {
    const { name, phone, profileImageBase64 } = req.body;
    const updates = {};
    if (name  !== undefined) updates.name  = name;
    if (phone !== undefined) updates.phone = phone;
    if (profileImageBase64 !== undefined) updates.profileImageBase64 = profileImageBase64;

    let col = 'students', docId = req.userId;
    if (req.role === 'teacher')  { col = 'teacher_accounts'; docId = req.userId.replace('teacher-', ''); }
    if (req.role === 'director') {
      col = 'schools'; docId = req.schoolId;
      if (name) updates.teacherName = name;
      if (profileImageBase64) updates.teacherPhotoBase64 = profileImageBase64;
      delete updates.name; delete updates.profileImageBase64;
    }

    await db().collection(col).doc(docId).update(updates);
    ok(res, { updated: true });
  } catch (e) { serverErr(res, e); }
});

// POST /api/students/request-password-reset — student sends request to homeroom
router.post('/request-password-reset', auth, role('student'), async (req, res) => {
  try {
    const d = db();
    const stuDoc = await d.collection('students').doc(req.userId).get();
    const stu    = stuDoc.data() || {};
    const clsDoc = await d.collection('classes').doc(stu.classId || '').get();
    const homeroomId = clsDoc.exists ? clsDoc.data().homeroomTeacherId : null;

    const id = uuid();
    await d.collection('faniyot').doc(id).set({
      id, type: 'password_reset',
      subject: `🔑 בקשת איפוס סיסמה - ${stu.name || ''}`,
      studentId: req.userId, studentName: stu.name || '',
      classId: stu.classId || '', schoolId: req.schoolId,
      targetTeacherId: homeroomId || null,
      messages: [{
        id: uuid(),
        text: `הסטודנט ${stu.name || ''} (ת.ז: ${stu.idNumber || ''}) מבקש לאפס סיסמה`,
        isTeacher: false, senderName: stu.name || '', sentAt: now(),
      }],
      status: 'open', createdAt: now(), updatedAt: now(),
    });
    ok(res, { sent: true, faniyaId: id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
