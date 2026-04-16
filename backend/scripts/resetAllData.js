const path = require('path');
const fs = require('fs/promises');
const dotenv = require('dotenv');
const { v2: cloudinary } = require('cloudinary');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const LawyerProfile = require('../models/LawyerProfile');
const Chat = require('../models/Chat');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const Review = require('../models/Review');

const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function extractCloudinaryAsset(url) {
  if (!url || !/^https?:\/\//i.test(url)) return null;

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('res.cloudinary.com')) return null;

    const parts = parsed.pathname.split('/').filter(Boolean);
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;

    const resourceType = parts[uploadIndex - 1];
    const remaining = parts.slice(uploadIndex + 1);
    const versionIndex = remaining.findIndex((part) => /^v\d+$/.test(part));
    const publicParts = versionIndex >= 0 ? remaining.slice(versionIndex + 1) : remaining;
    if (!publicParts.length) return null;

    const publicIdWithExt = publicParts.join('/');
    const publicId = publicIdWithExt.replace(/\.[^.\/]+$/, '');
    return {
      publicId,
      resourceType: ['image', 'raw', 'video'].includes(resourceType) ? resourceType : 'image',
    };
  } catch {
    return null;
  }
}

async function deleteCloudinaryAsset(url) {
  const asset = extractCloudinaryAsset(url);
  if (!asset || !cloudinaryConfigured) return;

  try {
    await cloudinary.uploader.destroy(asset.publicId, { resource_type: asset.resourceType });
  } catch (error) {
    console.warn(`Cloudinary delete failed for ${asset.publicId}: ${error.message}`);
  }
}

async function removeUploadsFolder() {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  await fs.rm(uploadsDir, { recursive: true, force: true });
  await fs.mkdir(path.join(uploadsDir, 'avatars'), { recursive: true });
  await fs.mkdir(path.join(uploadsDir, 'documents'), { recursive: true });
}

async function resetDatabase() {
  await connectDB();

  const users = await User.find({}).select('avatar');
  const lawyerProfiles = await LawyerProfile.find({}).select('documents');
  const appointments = await Appointment.find({}).select('caseDocuments');
  const documentsToDelete = new Set();

  for (const user of users) {
    if (user.avatar) documentsToDelete.add(user.avatar);
  }

  for (const profile of lawyerProfiles) {
    for (const doc of profile.documents || []) {
      if (doc?.url) documentsToDelete.add(doc.url);
    }
  }

  for (const appointment of appointments) {
    for (const doc of appointment.caseDocuments || []) {
      if (doc) documentsToDelete.add(doc);
    }
  }

  for (const url of documentsToDelete) {
    await deleteCloudinaryAsset(url);
  }

  await Promise.all([
    Review.deleteMany({}),
    Payment.deleteMany({}),
    Chat.deleteMany({}),
    Appointment.deleteMany({}),
    LawyerProfile.deleteMany({}),
    User.deleteMany({}),
  ]);

  await removeUploadsFolder();

  console.log('All database collections cleared.');
  console.log('Local uploads folder cleared.');
  if (cloudinaryConfigured) {
    console.log('Cloudinary assets referenced in the database were processed for deletion.');
  } else {
    console.log('Cloudinary not configured, so remote assets were skipped.');
  }
}

resetDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
