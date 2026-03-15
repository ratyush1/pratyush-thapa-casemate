require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const LawyerProfile = require('../models/LawyerProfile');
const Chat = require('../models/Chat');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();
  await User.deleteMany({});
  await LawyerProfile.deleteMany({});
  await Chat.deleteMany({});
  await Appointment.deleteMany({});
  await Payment.deleteMany({});

  // Single main admin – only one admin account in the system (cannot register as admin)
  const admin = await User.create({
    name: 'Main Admin',
    email: 'admin@casemate.com',
    password: 'admin123',
    role: 'admin',
  });

  const hashedLawyerPass = await bcrypt.hash('lawyer123', 12);
  const hashedClientPass = await bcrypt.hash('client123', 12);

  const dummyLawyerData = [
    { name: 'Priyanshu Dev', email: 'priyanshu.dev@casemate.test', phone: '+977-9800001001', specialization: ['Family Law', 'Divorce'], experience: 7, hourlyRate: 170, verified: true, rating: 4.6, totalReviews: 21 },
    { name: 'Niya Rai', email: 'niya.rai@casemate.test', phone: '+977-9800001002', specialization: ['Criminal Defense', 'Bail'], experience: 5, hourlyRate: 160, verified: true, rating: 4.4, totalReviews: 18 },
    { name: 'Pratyush Thapa', email: 'pratyush.thapa@casemate.test', phone: '+977-9800001003', specialization: ['Employment', 'Labor Disputes'], experience: 6, hourlyRate: 150, verified: true, rating: 4.5, totalReviews: 17 },
    { name: 'Mahima Subba', email: 'mahima.subba@casemate.test', phone: '+977-9800001004', specialization: ['Property', 'Tenant Rights'], experience: 8, hourlyRate: 175, verified: true, rating: 4.7, totalReviews: 25 },
    { name: 'Aaryan Rai', email: 'aaryan.rai@casemate.test', phone: '+977-9800001005', specialization: ['Contract', 'Consumer Rights'], experience: 4, hourlyRate: 135, verified: false, rating: 4.1, totalReviews: 11 },
    { name: 'Prabesh Rai', email: 'prabesh.rai@casemate.test', phone: '+977-9800001006', specialization: ['Family Law', 'Child Custody'], experience: 9, hourlyRate: 190, verified: true, rating: 4.8, totalReviews: 34 },
    { name: 'Bijay Tamang', email: 'bijay.tamang@casemate.test', phone: '+977-9800001007', specialization: ['Criminal Defense', 'FIR'], experience: 10, hourlyRate: 210, verified: true, rating: 4.9, totalReviews: 41 },
    { name: 'Dilip Rai', email: 'dilip.rai@casemate.test', phone: '+977-9800001008', specialization: ['Property', 'Land Disputes'], experience: 7, hourlyRate: 165, verified: true, rating: 4.5, totalReviews: 22 },
    { name: 'Ayushma Rai', email: 'ayushma.rai@casemate.test', phone: '+977-9800001009', specialization: ['Employment', 'Workplace Harassment'], experience: 5, hourlyRate: 145, verified: true, rating: 4.3, totalReviews: 14 },
    { name: 'Muna Gurung', email: 'muna.gurung@casemate.test', phone: '+977-9800001010', specialization: ['Contract', 'Insurance Claims'], experience: 6, hourlyRate: 155, verified: false, rating: 4.2, totalReviews: 13 },
    { name: 'Shusant Rai', email: 'shusant.rai@casemate.test', phone: '+977-9800001011', specialization: ['Criminal Defense', 'Cybercrime'], experience: 8, hourlyRate: 185, verified: true, rating: 4.7, totalReviews: 27 },
    { name: 'Atite Jimmie', email: 'atite.jimmie@casemate.test', phone: '+977-9800001012', specialization: ['Family Law', 'Domestic Violence'], experience: 6, hourlyRate: 150, verified: true, rating: 4.4, totalReviews: 16 },
    { name: 'Ritika Karki', email: 'ritika.karki@casemate.test', phone: '+977-9800001013', specialization: ['Property', 'Lease Agreements'], experience: 4, hourlyRate: 130, verified: false, rating: 4.0, totalReviews: 9 },
    { name: 'Sujan Shrestha', email: 'sujan.shrestha@casemate.test', phone: '+977-9800001014', specialization: ['Employment', 'Salary Recovery'], experience: 11, hourlyRate: 220, verified: true, rating: 4.9, totalReviews: 45 },
    { name: 'Aastha Bhandari', email: 'aastha.bhandari@casemate.test', phone: '+977-9800001015', specialization: ['Contract', 'Business Disputes'], experience: 7, hourlyRate: 180, verified: true, rating: 4.6, totalReviews: 24 },
    { name: 'Rohit Basnet', email: 'rohit.basnet@casemate.test', phone: '+977-9800001016', specialization: ['Criminal Defense', 'Fraud Cases'], experience: 9, hourlyRate: 200, verified: true, rating: 4.8, totalReviews: 33 },
    { name: 'Sneha Khadka', email: 'sneha.khadka@casemate.test', phone: '+977-9800001017', specialization: ['Family Law', 'Marriage Registration'], experience: 3, hourlyRate: 120, verified: false, rating: 3.9, totalReviews: 8 },
    { name: 'Kiran Limbu', email: 'kiran.limbu@casemate.test', phone: '+977-9800001018', specialization: ['Property', 'Boundary Disputes'], experience: 6, hourlyRate: 160, verified: true, rating: 4.4, totalReviews: 19 },
    { name: 'Nabin Poudel', email: 'nabin.poudel@casemate.test', phone: '+977-9800001019', specialization: ['Employment', 'Termination Cases'], experience: 8, hourlyRate: 175, verified: true, rating: 4.7, totalReviews: 28 },
    { name: 'Sofia Ale', email: 'sofia.ale@casemate.test', phone: '+977-9800001020', specialization: ['Contract', 'Consumer Complaints'], experience: 5, hourlyRate: 140, verified: false, rating: 4.1, totalReviews: 12 },
  ];

  const lawyers = await User.insertMany(
    dummyLawyerData.map((lawyer) => ({
      name: lawyer.name,
      email: lawyer.email,
      password: hashedLawyerPass,
      role: 'lawyer',
      phone: lawyer.phone,
      isVerified: lawyer.verified,
    }))
  );

  await LawyerProfile.insertMany(
    lawyers.map((lawyer, index) => {
      const source = dummyLawyerData[index];
      return {
        user: lawyer._id,
        specialization: source.specialization,
        experience: source.experience,
        bio: `${source.name} focuses on ${source.specialization.join(', ')} matters.`,
        hourlyRate: source.hourlyRate,
        verified: source.verified,
        rating: source.rating,
        totalReviews: source.totalReviews,
        documents: source.verified ? [{ name: 'Bar License', url: 'https://example.com/license.pdf' }] : [],
      };
    })
  );

  const clients = await User.insertMany([
    { name: 'John Doe', email: 'john@example.com', password: hashedClientPass, role: 'client', phone: '+1-555-1001' },
    { name: 'Jane Smith', email: 'jane@example.com', password: hashedClientPass, role: 'client', phone: '+1-555-1002' },
  ]);

  const chat = await Chat.create({
    user: clients[0]._id,
    title: 'Divorce inquiry',
    messages: [
      { role: 'user', content: 'I need advice on filing for divorce.' },
      { role: 'assistant', content: 'This sounds related to Family law. I recommend booking a consultation.', confidence: 0.5, escalationSuggested: true },
    ],
    escalated: true,
  });

  const apt1 = await Appointment.create({
    client: clients[0]._id,
    lawyer: lawyers[0]._id,
    date: new Date(Date.now() + 86400000 * 3),
    timeSlot: '10:00',
    duration: 60,
    status: 'accepted',
    caseDetails: 'Considering divorce, need guidance on process and custody.',
    amount: 150,
    paymentStatus: 'paid',
  });
  const apt2 = await Appointment.create({
    client: clients[1]._id,
    lawyer: lawyers[1]._id,
    date: new Date(Date.now() + 86400000 * 5),
    timeSlot: '14:00',
    duration: 60,
    status: 'pending',
    caseDetails: 'Immigration visa question.',
    amount: 200,
    paymentStatus: 'pending',
  });

  await Payment.create({
    user: clients[0]._id,
    appointment: apt1._id,
    amount: 150,
    status: 'completed',
    transactionId: 'SIM-' + Date.now(),
  });

  await Chat.findByIdAndUpdate(chat._id, { appointment: apt1._id });

  console.log('Seed completed.');
  console.log('--- Single main admin (only 1 admin in system) ---');
  console.log('Admin: admin@casemate.com / admin123');
  console.log(`Lawyers seeded: ${lawyers.length} accounts / lawyer123`);
  console.log('Sample lawyers: priyanshu.dev@casemate.test, niya.rai@casemate.test, pratyush.thapa@casemate.test');
  console.log('Clients: john@example.com, jane@example.com / client123');
  process.exit(0);
};

seed().catch((e) => { console.error(e); process.exit(1); });
