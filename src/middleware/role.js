module.exports = (...roles) => (req, res, next) => {
  if (!roles.includes(req.role))
    return res.status(403).json({ success: false, code: 'forbidden', allowed: roles });
  next();
};
