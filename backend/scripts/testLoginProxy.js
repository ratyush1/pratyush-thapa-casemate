const http = require('http');

const data = JSON.stringify({ email: 'admin@casemate.com', password: 'admin123' });

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    try {
      console.log('Status:', res.statusCode);
      console.log('Body:', JSON.parse(body));
    } catch (e) {
      console.error('Response parse error', e, body);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error', err);
});

req.write(data);
req.end();
