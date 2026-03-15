const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

(async () => {
  try {
    // login as a seeded client
    let res = await request({ hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email: 'john@example.com', password: 'client123' });
    console.log('Login:', res.status, res.body.success ? 'OK' : res.body);
    const token = res.body.token;
    if (!token) return console.error('No token');

    // list appointments
    res = await request({ hostname: 'localhost', port: 5000, path: '/api/appointments', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
    console.log('Appointments:', res.status);
    if (!res.body.appointments || res.body.appointments.length === 0) return console.error('No appointments to test with.');
    const apt = res.body.appointments[0];
    console.log('Using appointment', apt._id);

    // ensure chat exists
    res = await request({ hostname: 'localhost', port: 5000, path: `/api/appointments/${apt._id}/chat`, method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    console.log('Create chat:', res.status, res.body.success ? 'OK' : res.body);

    // send message
    res = await request({ hostname: 'localhost', port: 5000, path: `/api/appointments/${apt._id}/chat/messages`, method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }, { content: 'Hello from automated test' });
    console.log('Send message:', res.status, res.body.success ? 'OK' : res.body);
    console.log('Chat messages count:', res.body.chat ? res.body.chat.messages.length : 'n/a');
  } catch (e) {
    console.error('Error', e);
  }
})();
