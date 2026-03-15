const io = require('socket.io-client');
const axios = require('axios');

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

(async ()=>{
  try{
    const t = Date.now();
    const lawyerEmail = `lawyer${t}@example.com`;
    const clientEmail = `client${t}@example.com`;
    console.log('Registering users...');
    const regLawyer = await api.post('/auth/register', { name: 'Test Lawyer', email: lawyerEmail, password: 'password', role: 'lawyer' });
    const regClient = await api.post('/auth/register', { name: 'Test Client', email: clientEmail, password: 'password', role: 'client' });
    const lawyerToken = regLawyer.data.token;
    const clientToken = regClient.data.token;
    console.log('Registered lawyer:', regLawyer.data.user.id, 'client:', regClient.data.user.id);

    // create appointment as client
    const date = new Date(Date.now() + 24*3600*1000).toISOString();
    const create = await api.post('/appointments', { lawyerId: regLawyer.data.user.id, date, timeSlot: '10:00', caseDetails: 'Test case' }, { headers: { Authorization: `Bearer ${clientToken}` } });
    const appointment = create.data.appointment;
    console.log('Created appointment', appointment._id, 'status', appointment.status);

    // Start sockets to listen
    console.log('Connecting sockets...');
    const clientSocket = io('http://localhost:5000', { path: '/socket.io', auth: { token: clientToken } });
    const lawyerSocket = io('http://localhost:5000', { path: '/socket.io', auth: { token: lawyerToken } });

    clientSocket.on('connect', () => console.log('client socket connected', clientSocket.id));
    lawyerSocket.on('connect', () => console.log('lawyer socket connected', lawyerSocket.id));

    clientSocket.on('appointment_message', (p) => console.log('client received appointment_message', JSON.stringify(p).slice(0,300)));
    lawyerSocket.on('appointment_message', (p) => console.log('lawyer received appointment_message', JSON.stringify(p).slice(0,300)));
    clientSocket.on('appointment_notification', (p) => console.log('client received appointment_notification', p));
    lawyerSocket.on('appointment_notification', (p) => console.log('lawyer received appointment_notification', p));

    // Wait a bit
    await sleep(1500);

    // Lawyer accepts the appointment
    console.log('Lawyer accepting appointment...');
    await api.patch(`/appointments/${appointment._id}/status`, { status: 'accepted' }, { headers: { Authorization: `Bearer ${lawyerToken}` } });
    await sleep(800);

    // Now have client join room via socket
    console.log('Client joining appointment room via socket');
    clientSocket.emit('joinAppointment', appointment._id);
    lawyerSocket.emit('joinAppointment', appointment._id);
    await sleep(800);

    // Client posts a chat message
    console.log('Client sending chat message via API');
    const msg = await api.post(`/appointments/${appointment._id}/chat/messages`, { content: 'Hello from client test' }, { headers: { Authorization: `Bearer ${clientToken}` } });
    console.log('Message post response OK');

    // Wait to receive events
    await sleep(3000);

    clientSocket.disconnect();
    lawyerSocket.disconnect();
    console.log('Test finished');
    process.exit(0);
  }catch(e){
    console.error('Test error', e.response ? e.response.data : e.message, e.stack);
    process.exit(1);
  }
})();
