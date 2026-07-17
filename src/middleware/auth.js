const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ success: false, code: 'no_token' });
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET);
    req.user     = p;
    req.userId   = p.userId;
    req.schoolId = p.schoolId;
    req.role     = p.role;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, code: 'invalid_token' });
  }
};
