const http = require('http');

const login = () => new Promise((resolve) => {
  const data = JSON.stringify({ email: 'admin@casemate.com', password: 'admin123' });
  const options = { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (c) => body += c);
    res.on('end', () => {
      try { const obj = JSON.parse(body); resolve(obj.token); } catch (e) { resolve(null); }
    });
  });
  req.on('error', () => resolve(null));
  req.write(data);
  req.end();
});

const run = (token) => new Promise((resolve) => {
  const options = { hostname: 'localhost', port: 5000, path: '/api/admin/lawyers', method: 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {} };
  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (c) => body += c);
    res.on('end', () => {
      try { console.log(JSON.parse(body)); } catch (e) { console.log(body); }
      resolve();
    });
  });
  req.on('error', (err) => { console.error(err); resolve(); });
  req.end();
});

(async () => {
  const token = await login();
  console.log('Token present:', !!token);
  await run(token);
})();
