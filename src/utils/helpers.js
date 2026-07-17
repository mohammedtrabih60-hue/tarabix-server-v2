const { v4: uuid } = require('uuid');

const now = () => new Date().toISOString();

const ok  = (res, data) => res.json({ success: true,  data });
const err = (res, code, msg, status = 400) =>
  res.status(status).json({ success: false, code, message: msg });

const serverErr = (res, e) => {
  console.error(e);
  return res.status(500).json({ success: false, code: 'server_error', message: e.message });
};

module.exports = { uuid, now, ok, err, serverErr };
