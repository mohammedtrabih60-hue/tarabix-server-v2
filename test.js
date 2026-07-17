const BASE = 'https://tarabix-server-v2-production.up.railway.app/api';
let token = '';
let pass = 0, fail = 0;

async function req(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}

async function test(name, fn) {
  try {
    const res = await fn();
    if (res.success) { console.log(`  ✅ ${name}`); pass++; }
    else { console.log(`  ❌ ${name} — ${res.code}`); fail++; }
  } catch(e) { console.log(`  💥 ${name} — ${e.message}`); fail++; }
}

async function run() {
  console.log('\n🧪 Tarabix Server Tests\n');

  const h = await fetch('https://tarabix-server-v2-production.up.railway.app/health').then(r=>r.json());
  console.log(`  ✅ Health: ${h.routes} routes`);

  console.log('\n── Auth ──');
  await test('Login', async () => {
    const res = await req('POST', '/auth/login', { email: 'superadmin@tarabix.com', password: 'Admin@2024!' });
    if (res.success) token = res.data.token;
    return res;
  });
  await test('GET /auth/me', () => req('GET', '/auth/me'));

  console.log('\n── Users ──');
  await test('GET /schools',  () => req('GET', '/schools'));
  await test('GET /classes',  () => req('GET', '/classes'));
  await test('GET /students', () => req('GET', '/students'));
  await test('GET /teachers', () => req('GET', '/teachers'));

  console.log('\n── Academic ──');
  await test('GET /grades',       () => req('GET', '/grades'));
  await test('GET /attendance',   () => req('GET', '/attendance'));
  await test('GET /quizzes',      () => req('GET', '/quizzes'));
  await test('GET /assignments',  () => req('GET', '/assignments'));
  await test('GET /courses',      () => req('GET', '/courses'));
  await test('GET /schedule',     () => req('GET', '/schedule'));

  console.log('\n── Communication ──');
  await test('GET /messages',      () => req('GET', '/messages'));
  await test('GET /announcements', () => req('GET', '/announcements'));
  await test('GET /faniyot',       () => req('GET', '/faniyot'));
  await test('GET /group-chat',    () => req('GET', '/group-chat'));

  console.log('\n── Finance ──');
  await test('GET /payments', () => req('GET', '/payments'));

  console.log('\n── Tools ──');
  await test('GET /reminders',    () => req('GET', '/reminders'));
  await test('GET /notes',        () => req('GET', '/notes'));
  await test('GET /competitions', () => req('GET', '/competitions'));

  console.log('\n── AI & Games ──');
  await test('POST /ai/solve',                () => req('POST', '/ai/solve', { problem: '2+2' }));
  await test('GET /millionaire/leaderboard',  () => req('GET', '/millionaire/leaderboard'));

  console.log(`\n${'─'.repeat(35)}`);
  console.log(`✅ ${pass} passed  ❌ ${fail} failed`);
  console.log(fail === 0 ? '\n🎉 ALL TESTS PASSED!' : `\n⚠️  ${fail} failed`);
}

run().catch(console.error);