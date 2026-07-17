const router = require('express').Router();
const auth   = require('../middleware/auth');
const { db } = require('../config/firebase');
const { ok, err, serverErr } = require('../utils/helpers');

router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('attendance').where('schoolId', '==', req.schoolId);
    if (req.query.studentId) q = q.where('studentId', '==', req.query.studentId);
    if (req.query.classId)   q = q.where('classId',   '==', req.query.classId);
    if (req.query.date)      q = q.where('date',       '==', req.query.date);
    const snap = await q.orderBy('date', 'desc').limit(1000).get();
    ok(res, snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { serverErr(res, e); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { records } = req.body;
    if (!records?.length) return err(res, 'no_records', 'records[] required');
    const d   = db();
    const bat = d.batch();
    const dateStr = (records[0]?.date || new Date().toISOString()).split('T')[0];
    records.forEach(r => {
      const id = `${r.studentId}_${dateStr}`;
      bat.set(d.collection('attendance').doc(id), {
        id, studentId: r.studentId, studentName: r.studentName || '',
        classId: r.classId || '', schoolId: req.schoolId,
        present: r.present ?? true, note: r.note || '',
        date: r.date || new Date().toISOString(), recordedBy: req.userId,
      });
    });
    await bat.commit();
    ok(res, { saved: records.length, date: dateStr });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
