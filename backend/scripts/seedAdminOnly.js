require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

const seedAdminOnly = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@casemate.com' });
    if (existingAdmin) {
      console.log('Admin account already exists: admin@casemate.com / admin123');
      process.exit(0);
    }

    // Create admin account only
    const admin = await User.create({
      name: 'Main Admin',
      email: 'admin@casemate.com',
      password: 'admin123',
      role: 'admin',
    });

    console.log('Admin account created successfully');
    console.log(`Email: ${admin.email}`);
    console.log(`Password: admin123`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdminOnly();
