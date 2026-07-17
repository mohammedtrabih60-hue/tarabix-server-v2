const router = require('express').Router();
const auth   = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('assignments').where('schoolId', '==', req.schoolId);
    if (req.query.classId) q = q.where('classId', '==', req.query.classId);
    const snap = await q.get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

router.post('/', auth, async (req, res) => {
  try {
    const id = uuid();
    const a  = { id, ...req.body, schoolId: req.schoolId, createdBy: req.userId, createdAt: now() };
    await db().collection('assignments').doc(id).set(a);
    ok(res, a);
  } catch (e) { serverErr(res, e); }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    await db().collection('assignments').doc(req.params.id).update(req.body);
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db().collection('assignments').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

router.post('/:id/submit', auth, async (req, res) => {
  try {
    const id  = uuid();
    const sub = {
      id, assignmentId: req.params.id, studentId: req.userId,
      studentName: req.body.studentName || '', content: req.body.content || '',
      fileBase64: req.body.fileBase64 || null, fileName: req.body.fileName || null,
      schoolId: req.schoolId, submittedAt: now(), grade: null, teacherNote: null,
    };
    await db().collection('assignment_submissions').doc(id).set(sub);
    ok(res, sub);
  } catch (e) { serverErr(res, e); }
});

router.patch('/submissions/:id/grade', auth, async (req, res) => {
  try {
    const { grade, teacherNote } = req.body;
    await db().collection('assignment_submissions').doc(req.params.id)
      .update({ grade, teacherNote: teacherNote || '', gradedAt: now(), gradedBy: req.userId });
    ok(res, { id: req.params.id, grade });
  } catch (e) { serverErr(res, e); }
});

router.get('/submissions', auth, async (req, res) => {
  try {
    let q = db().collection('assignment_submissions').where('schoolId', '==', req.schoolId);
    if (req.query.studentId)    q = q.where('studentId',    '==', req.query.studentId);
    if (req.query.assignmentId) q = q.where('assignmentId', '==', req.query.assignmentId);
    const snap = await q.get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
