require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

const run = async () => {
  await connectDB();
  const user = await User.findOne({ email: 'admin@casemate.com' }).select('+password');
  if (!user) {
    console.log('Admin user not found');
    process.exit(0);
  }
  console.log('Admin found:');
  console.log({ id: user._id.toString(), email: user.email, name: user.name, role: user.role, passwordHash: user.password.slice(0, 10) + '...' });
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });
