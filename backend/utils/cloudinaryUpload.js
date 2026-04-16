const fs = require('fs/promises');
const { v2: cloudinary } = require('cloudinary');

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

async function uploadLocalFileToCloudinary(localFilePath, options = {}) {
  if (!cloudinaryConfigured || !localFilePath) return null;

  const uploadResult = await cloudinary.uploader.upload(localFilePath, {
    folder: options.folder || 'casemate/uploads',
    resource_type: options.resourceType || 'auto',
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  });

  return {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    resourceType: uploadResult.resource_type,
    format: uploadResult.format,
  };
}

async function removeLocalFile(localFilePath) {
  if (!localFilePath) return;
  try {
    await fs.unlink(localFilePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('Failed to remove local file:', err.message);
    }
  }
}

module.exports = {
  cloudinaryConfigured,
  uploadLocalFileToCloudinary,
  removeLocalFile,
};
