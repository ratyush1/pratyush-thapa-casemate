const User = require('../models/User');
const LawyerProfile = require('../models/LawyerProfile');
const mongoose = require('mongoose');
const { getIO } = require('../utils/socket');

const PRACTICE_AREA_KEYWORDS = {
  family: ['family', 'divorce', 'custody', 'alimony', 'domestic violence', 'marriage', 'child', 'inheritance'],
  criminal: ['criminal', 'fir', 'arrest', 'bail', 'theft', 'assault', 'fraud', 'cybercrime', 'police'],
  employment: ['employment', 'labor', 'salary', 'termination', 'overtime', 'severance', 'gratuity', 'workplace'],
  property: ['property', 'tenant', 'landlord', 'rent', 'eviction', 'land', 'boundary', 'lease'],
  contract: ['contract', 'consumer', 'banking', 'refund', 'business', 'breach', 'loan', 'insurance'],
};

function normalizeText(text = '') {
  return String(text || '').toLowerCase();
}

function tokenize(text = '') {
  return normalizeText(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function inferPracticeArea(caseSummary = '', explicitCaseArea = '') {
  const explicit = normalizeText(explicitCaseArea).trim();
  if (explicit && PRACTICE_AREA_KEYWORDS[explicit]) return explicit;

  const text = normalizeText(caseSummary);
  if (!text) return '';

  let bestArea = '';
  let bestScore = 0;
  for (const [area, keywords] of Object.entries(PRACTICE_AREA_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestArea = area;
    }
  }
  return bestScore > 0 ? bestArea : '';
}

function scoreLawyerRecommendation(profile, caseSummary = '', inferredArea = '') {
  const specs = Array.isArray(profile?.specialization) ? profile.specialization : [];
  const specsText = normalizeText(specs.join(' '));
  const summaryTokens = tokenize(caseSummary);
  const reasons = [];
  let score = 0;

  if (inferredArea && PRACTICE_AREA_KEYWORDS[inferredArea]) {
    const areaKeywords = PRACTICE_AREA_KEYWORDS[inferredArea];
    const areaMatchCount = areaKeywords.reduce((acc, keyword) => (specsText.includes(keyword) ? acc + 1 : acc), 0);
    if (areaMatchCount > 0) {
      score += 30 + Math.min(areaMatchCount * 4, 20);
      reasons.push(`Specialization matches ${inferredArea} case type`);
    }
  }

  let tokenMatchCount = 0;
  for (const token of summaryTokens) {
    if (specsText.includes(token)) tokenMatchCount += 1;
  }
  if (tokenMatchCount > 0) {
    score += Math.min(tokenMatchCount * 4, 24);
    reasons.push('Specialization aligns with your case details');
  }

  if (profile?.verified) {
    score += 12;
    reasons.push('Verified by admin');
  }

  const experience = Number(profile?.experience || 0);
  if (experience > 0) {
    score += Math.min(experience, 20) * 0.6;
  }

  const rating = Number(profile?.rating || 0);
  if (rating > 0) {
    score += Math.min(rating, 5) * 3;
  }

  return {
    score: Math.round(score * 10) / 10,
    reasons,
  };
}

function sanitizePublicLawyerProfile(profileDoc) {
  if (!profileDoc) return null;
  const profile = profileDoc.toObject ? profileDoc.toObject() : { ...profileDoc };
  delete profile.documents;
  return profile;
}

exports.getLawyers = async (req, res) => {
  try {
    const { specialization, minRate, maxRate, verified, search, caseSummary, caseArea } = req.query;
    // Populate user and ensure only profiles that have an existing user with role 'lawyer' are returned
    let profiles = await LawyerProfile.find({}).populate({ path: 'user', select: 'name email avatar role isActive' });
    profiles = profiles.filter((p) => p.user && p.user.role === 'lawyer');
    if (specialization) {
      const spec = new RegExp(specialization, 'i');
      profiles = profiles.filter((p) => p.specialization.some((s) => spec.test(s)));
    }
    if (search) {
      const term = new RegExp(String(search).trim(), 'i');
      profiles = profiles.filter((p) => {
        const userName = p.user?.name || '';
        const userEmail = p.user?.email || '';
        const specs = Array.isArray(p.specialization) ? p.specialization : [];
        return term.test(userName) || term.test(userEmail) || specs.some((s) => term.test(s));
      });
    }
    if (minRate != null) profiles = profiles.filter((p) => p.hourlyRate >= Number(minRate));
    if (maxRate != null) profiles = profiles.filter((p) => p.hourlyRate <= Number(maxRate));
    if (verified === 'true') profiles = profiles.filter((p) => p.verified);

    const trimmedCaseSummary = String(caseSummary || '').trim();
    const inferredArea = inferPracticeArea(trimmedCaseSummary, caseArea);

    let lawyers = profiles.map((p) => {
      const recommendation = scoreLawyerRecommendation(p, trimmedCaseSummary, inferredArea);
      return {
        ...p.user.toObject(),
        profile: { ...sanitizePublicLawyerProfile(p), user: undefined },
        recommendationScore: recommendation.score,
        recommendationReasons: recommendation.reasons,
      };
    });

    if (trimmedCaseSummary || inferredArea) {
      lawyers = lawyers.sort((a, b) => {
        const scoreDiff = (b.recommendationScore || 0) - (a.recommendationScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
        const aRate = Number(a.profile?.rating || 0);
        const bRate = Number(b.profile?.rating || 0);
        if (bRate !== aRate) return bRate - aRate;
        const aExp = Number(a.profile?.experience || 0);
        const bExp = Number(b.profile?.experience || 0);
        return bExp - aExp;
      });
    }

    res.json({
      success: true,
      lawyers,
      recommendation: {
        enabled: Boolean(trimmedCaseSummary || inferredArea),
        inferredArea: inferredArea || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLawyerById = async (req, res) => {
  try {
    const lawyer = await User.findOne({ _id: req.params.id, role: 'lawyer' }).select('-password');
    if (!lawyer) return res.status(404).json({ success: false, message: 'Lawyer not found' });
    const profile = await LawyerProfile.findOne({ user: lawyer._id });
    res.json({ success: true, lawyer, profile: sanitizePublicLawyerProfile(profile) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    let profile = await LawyerProfile.findOne({ user: req.user.id });
    if (!profile) profile = await LawyerProfile.create({ user: req.user.id });
    const allowed = ['specialization', 'barNumber', 'experience', 'bio', 'hourlyRate', 'availability'];
    allowed.forEach((key) => { if (req.body[key] !== undefined) profile[key] = req.body[key]; });
    await profile.save();

    try {
      const io = getIO();
      io.emit('lawyer_updated', { lawyerId: req.user.id.toString(), action: 'profile_updated' });
    } catch (e) {
      // ignore socket errors
    }

    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const profile = await LawyerProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addDocument = async (req, res) => {
  try {
    let profile = await LawyerProfile.findOne({ user: req.user.id });
    if (!profile) profile = await LawyerProfile.create({ user: req.user.id });
    const { name, url } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Document name is required' });
    profile.documents = profile.documents || [];
    profile.documents.push({ name: name.trim(), url: (url || '').trim(), uploadedAt: new Date() });
    await profile.save();

    try {
      const io = getIO();
      io.emit('lawyer_updated', { lawyerId: req.user.id.toString(), action: 'document_added' });
    } catch (e) {
      // ignore socket errors
    }

    res.status(201).json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded. Choose a PDF or image (JPEG, PNG, GIF, WebP).' });
    let profile = await LawyerProfile.findOne({ user: req.user.id });
    if (!profile) profile = await LawyerProfile.create({ user: req.user.id });
    const name = (req.body.name || req.file.originalname || 'Document').trim() || 'Document';
    const url = '/uploads/documents/' + req.file.filename;
    profile.documents = profile.documents || [];
    profile.documents.push({ name, url, uploadedAt: new Date() });
    await profile.save();

    try {
      const io = getIO();
      io.emit('lawyer_updated', { lawyerId: req.user.id.toString(), action: 'document_uploaded' });
    } catch (e) {
      // ignore socket errors
    }

    res.status(201).json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No avatar uploaded. Choose an image (JPEG, PNG, GIF, WebP).' });
    // update user avatar url
    const avatarUrl = '/uploads/avatars/' + req.file.filename;
    const user = await User.findByIdAndUpdate(req.user.id, { avatar: avatarUrl }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    try {
      const io = getIO();
      io.emit('lawyer_updated', { lawyerId: req.user.id.toString(), action: 'avatar_updated' });
      io.emit('user_updated', { userId: req.user.id.toString(), action: 'avatar_updated', avatar: avatarUrl });
    } catch (e) {
      // ignore socket errors
    }

    res.json({ success: true, user, avatar: avatarUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removeDocument = async (req, res) => {
  try {
    const profile = await LawyerProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0 || index >= (profile.documents || []).length) {
      return res.status(400).json({ success: false, message: 'Invalid document index' });
    }
    profile.documents.splice(index, 1);
    await profile.save();

    try {
      const io = getIO();
      io.emit('lawyer_updated', { lawyerId: req.user.id.toString(), action: 'document_removed' });
    } catch (e) {
      // ignore socket errors
    }

    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
