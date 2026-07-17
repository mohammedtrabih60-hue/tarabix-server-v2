const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const auth   = require('../middleware/auth');
const { db } = require('../config/firebase');
const { ok, err, serverErr } = require('../utils/helpers');

const sign = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return err(res, 'missing_fields', 'Email and password required');

    const lEmail = email.trim().toLowerCase();
    const pass   = password.trim();
    const d      = db();

    // 1. Super admin
    const adminEmail = (process.env.ADMIN_EMAIL || 'superadmin@tarabix.com').toLowerCase();
    const adminPass  =  process.env.ADMIN_PASSWORD || 'Admin@2024!';
    if (lEmail === adminEmail && pass === adminPass) {
      return ok(res, {
        token: sign({ userId: 'superadmin', role: 'admin', schoolId: null }),
        user: { id: 'superadmin', role: 'admin', name: 'Super Admin', email: lEmail },
      });
    }

    // 2. Director (school teacherEmail)
    const schoolSnap = await d.collection('schools')
      .where('teacherEmail', '==', lEmail).limit(1).get();
    if (!schoolSnap.empty) {
      const s = { id: schoolSnap.docs[0].id, ...schoolSnap.docs[0].data() };
      if (!s.isActive)  return err(res, 'school_inactive', 'School is inactive', 403);
      if ((s.teacherPassword || '').trim() !== pass)
        return err(res, 'wrong_password', 'Wrong password', 401);
      return ok(res, {
        token: sign({ userId: `director-${s.id}`, role: 'director', schoolId: s.id }),
        user: {
          id: `director-${s.id}`, role: 'director', email: lEmail,
          name: s.teacherName || '', schoolId: s.id, schoolName: s.name || '',
          phone: s.teacherPhone || '', profileImageBase64: s.teacherPhotoBase64 || null,
        },
      });
    }

    // 3. Teacher
    const tSnap = await d.collection('teacher_accounts')
      .where('email', '==', lEmail).limit(1).get();
    if (!tSnap.empty) {
      const t = { id: tSnap.docs[0].id, ...tSnap.docs[0].data() };
      if (!t.isActive) return err(res, 'teacher_inactive', 'Account inactive', 401);
      if ((t.password || '').trim() !== pass)
        return err(res, 'wrong_password', 'Wrong password', 401);
      const sDoc = await d.collection('schools').doc(t.schoolId).get();
      if (!sDoc.exists || !sDoc.data().isActive)
        return err(res, 'school_inactive', 'School inactive', 403);
      return ok(res, {
        token: sign({ userId: `teacher-${t.id}`, role: 'teacher', schoolId: t.schoolId }),
        user: {
          id: `teacher-${t.id}`, role: 'teacher', email: lEmail,
          name: t.name || '', schoolId: t.schoolId, schoolName: sDoc.data().name || '',
          allowedClassIds: t.allowedClassIds || [],
          phone: t.phone || '', profileImageBase64: t.profileImageBase64 || null,
        },
      });
    }

    // 4. Student
    const stuSnap = await d.collection('students')
      .where('email', '==', lEmail).limit(1).get();
    if (!stuSnap.empty) {
      const s = { id: stuSnap.docs[0].id, ...stuSnap.docs[0].data() };
      if ((s.password || '').trim() !== pass)
        return err(res, 'wrong_password', 'Wrong password', 401);
      if (s.status === 'pending')  return err(res, 'pending',  'Account pending',  403);
      if (s.status === 'rejected') return err(res, 'rejected', 'Account rejected', 403);
      return ok(res, {
        token: sign({ userId: s.id, role: 'student', schoolId: s.schoolId }),
        user: {
          id: s.id, role: 'student', email: lEmail,
          name: s.name || '', schoolId: s.schoolId || '',
          schoolName: s.schoolName || '', classId: s.classId || '',
          className: s.className || '', status: s.status || 'approved',
          idNumber: s.idNumber || '', phone: s.phone || '',
          profileImageBase64: s.profileImageBase64 || null,
          joinedAt: s.joinedAt || null,
        },
      });
    }

    // 5. Parent
    const pSnap = await d.collection('parents')
      .where('email', '==', lEmail).limit(1).get();
    if (!pSnap.empty) {
      const p = { id: pSnap.docs[0].id, ...pSnap.docs[0].data() };
      if ((p.password || '').trim() !== pass)
        return err(res, 'wrong_password', 'Wrong password', 401);
      return ok(res, {
        token: sign({ userId: p.id, role: 'parent', schoolId: p.schoolId }),
        user: {
          id: p.id, role: 'parent', email: lEmail,
          name: p.name || '', schoolId: p.schoolId || '',
          schoolName: p.schoolName || '', studentIds: p.studentIds || [],
        },
      });
    }

    return err(res, 'not_found', 'User not found', 401);
  } catch (e) { serverErr(res, e); }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => ok(res, req.user));

// POST /api/auth/refresh
router.post('/refresh', auth, (req, res) => {
  const { userId, role, schoolId } = req.user;
  ok(res, { token: sign({ userId, role, schoolId }) });
});

module.exports = router;
