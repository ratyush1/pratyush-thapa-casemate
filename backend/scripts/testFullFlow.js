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
    // register client
    const email = 'tester+' + Date.now() + '@example.com';
    const password = 'tester123';
    console.log('Registering', email);
    let res = await request({ hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { name: 'Tester', email, password, role: 'client' });
    console.log('Register status', res.status);
    // login
    res = await request({ hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email, password });
    console.log('Login status', res.status);
    const token = res.body.token;
    if (!token) return console.error('Login failed', res.body);

    // get lawyers
    res = await request({ hostname: 'localhost', port: 5000, path: '/api/lawyers', method: 'GET' });
    if (!res.body || !Array.isArray(res.body.lawyers) || res.body.lawyers.length === 0) return console.error('No lawyers');
    const lawyer = res.body.lawyers[0];
    console.log('Using lawyer:', lawyer._id);
    const lawyerId = lawyer._id;
    if (!lawyerId) return console.error('Could not determine lawyer id');

    // create appointment
    const date = new Date(Date.now() + 86400000 * 2).toISOString();
    res = await request({ hostname: 'localhost', port: 5000, path: '/api/appointments', method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }, { lawyerId, date, timeSlot: '11:00', caseDetails: 'Test appointment', duration: 60 });
    console.log('Create appointment:', res.status, res.body.success ? 'OK' : res.body);
    const appointment = res.body.appointment;
    if (!appointment) return console.error('Appointment creation failed');

    // create chat and send message
    res = await request({ hostname: 'localhost', port: 5000, path: `/api/appointments/${appointment._id}/chat`, method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    console.log('Create chat:', res.status);
    res = await request({ hostname: 'localhost', port: 5000, path: `/api/appointments/${appointment._id}/chat/messages`, method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }, { content: 'Hello from tester client' });
    console.log('Send message:', res.status, res.body.success ? 'OK' : res.body);
    console.log('Chat now has messages:', res.body.chat ? res.body.chat.messages.length : 'n/a');
  } catch (e) {
    console.error('Error', e);
  }
})();
