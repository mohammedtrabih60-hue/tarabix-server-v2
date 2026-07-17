const router = require('express').Router();
const auth   = require('../middleware/auth');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'lessons');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

router.get('/', auth, async (req, res) => {
  try {
    const snap = await db().collection('courses').where('schoolId', '==', req.schoolId).get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

router.post('/', auth, async (req, res) => {
  try {
    const id = uuid();
    const c  = { id, ...req.body, schoolId: req.schoolId, createdBy: req.userId, createdAt: now(), lessons: [] };
    await db().collection('courses').doc(id).set(c);
    ok(res, c);
  } catch (e) { serverErr(res, e); }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    await db().collection('courses').doc(req.params.id).update(req.body);
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db().collection('courses').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// POST /api/courses/:id/lessons — add lesson (text/link)
router.post('/:id/lessons', auth, async (req, res) => {
  try {
    const lessonId = uuid();
    const lesson = { id: lessonId, courseId: req.params.id, ...req.body, schoolId: req.schoolId, createdAt: now() };
    await db().collection('lessons').doc(lessonId).set(lesson);
    ok(res, lesson);
  } catch (e) { serverErr(res, e); }
});

// POST /api/courses/:id/lessons/upload — upload file
router.post('/:id/lessons/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return err(res, 'no_file', 'file required');
    const lessonId  = req.body.lessonId || uuid();
    const fileUrl   = `/uploads/lessons/${req.file.filename}`;
    const lesson = {
      id: lessonId, courseId: req.params.id,
      title: req.body.title || req.file.originalname,
      type: 'file', fileUrl, mimeType: req.file.mimetype,
      originalName: req.file.originalname, fileSize: req.file.size,
      schoolId: req.schoolId, uploadedBy: req.userId, createdAt: now(),
    };
    await db().collection('lessons').doc(lessonId).set(lesson, { merge: true });
    ok(res, lesson);
  } catch (e) { serverErr(res, e); }
});

// GET /api/courses/:id/lessons
router.get('/:id/lessons', auth, async (req, res) => {
  try {
    const snap = await db().collection('lessons').where('courseId', '==', req.params.id).get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

router.delete('/:courseId/lessons/:lessonId', auth, async (req, res) => {
  try {
    await db().collection('lessons').doc(req.params.lessonId).delete();
    ok(res, { deleted: req.params.lessonId });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
