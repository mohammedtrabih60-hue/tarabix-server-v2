require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const path        = require('path');
const { init }    = require('./src/config/firebase');

init();

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.options('*', cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/api/', rateLimit({ windowMs: 60000, max: 500, message: { success: false, code: 'rate_limited' } }));
app.use(express.static(path.join(__dirname, 'web')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',          require('./src/routes/auth'));
app.use('/api/schools',       require('./src/routes/schools'));
app.use('/api/classes',       require('./src/routes/classes'));
app.use('/api/students',      require('./src/routes/students'));
app.use('/api/teachers',      require('./src/routes/teachers'));
app.use('/api/parents',       require('./src/routes/parents'));
app.use('/api/grades',        require('./src/routes/grades'));
app.use('/api/attendance',    require('./src/routes/attendance'));
app.use('/api/quizzes',       require('./src/routes/quizzes'));
app.use('/api/assignments',   require('./src/routes/assignments'));
app.use('/api/courses',       require('./src/routes/courses'));
app.use('/api/schedule',      require('./src/routes/schedule'));
app.use('/api/messages',      require('./src/routes/messages'));
app.use('/api/announcements', require('./src/routes/announcements'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/faniyot',       require('./src/routes/faniyot'));
app.use('/api/group-chat',    require('./src/routes/group_chat'));
app.use('/api/points',        require('./src/routes/points'));
app.use('/api/payments',      require('./src/routes/payments'));
app.use('/api/certificates',  require('./src/routes/certificates'));
app.use('/api/ai',            require('./src/routes/ai'));
app.use('/api/millionaire',   require('./src/routes/millionaire'));
app.use('/api/access-codes',  require('./src/routes/access_codes'));
app.use('/api/reminders',     require('./src/routes/reminders'));
app.use('/api/notes',         require('./src/routes/notes'));
app.use('/api/pomodoro',      require('./src/routes/pomodoro'));
app.use('/api/whiteboard',    require('./src/routes/whiteboard'));
app.use('/api/competitions',  require('./src/routes/competitions'));

app.get('/health', (_, res) => res.json({
  status: 'ok',
  server: 'Tarabix Academy v2.0 — COMPLETE',
  routes: 28,
  time: new Date().toISOString(),
}));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/health') && !req.path.startsWith('/uploads'))
    res.sendFile(path.join(__dirname, 'web', 'index.html'));
  else
    res.status(404).json({ success: false, code: 'not_found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n🚀 Tarabix Academy Server v2.0 — COMPLETE');
  console.log(`📡 http://localhost:${PORT}/health`);
  console.log('📦 28 routes ready\n');
});