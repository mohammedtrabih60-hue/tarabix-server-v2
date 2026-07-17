const fs = require('fs');

const files = ['grades','attendance','quizzes','assignments','schedule',
               'messages','announcements','faniyot','group_chat','payments','millionaire'];

files.forEach(f => {
  const path = `src/routes/${f}.js`;
  try {
    let c = fs.readFileSync(path, 'utf8');
    c = c.replace(/\.orderBy\([^)]+\)/g, '');
    c = c.replace(/\.limit\(\d+\)/g, '');
    fs.writeFileSync(path, c);
    console.log('✅ fixed:', f);
  } catch(e) {
    console.log('❌ skip:', f, e.message);
  }
});

console.log('\nDone! Now run: git add -A && git commit -m "fix" && git push');