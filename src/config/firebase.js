const admin = require('firebase-admin');
let _db, _msg, _init = false;

function init() {
  if (_init) return;
  _init = true;
  let sa;
  try {
    const env = process.env.FIREBASE_SERVICE_ACCOUNT || '';
    sa = env.startsWith('{') ? JSON.parse(env) : require(require('path').resolve('./firebase-service-account.json'));
  } catch { sa = require(require('path').resolve('./firebase-service-account.json')); }
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  _db  = admin.firestore();
  _msg = admin.messaging();
  _db.settings({ ignoreUndefinedProperties: true });
  console.log('✅ Firebase:', sa.project_id);
}

const db  = () => { if (!_db)  init(); return _db;  };
const msg = () => { if (!_msg) init(); return _msg; };
module.exports = { init, db, msg };
