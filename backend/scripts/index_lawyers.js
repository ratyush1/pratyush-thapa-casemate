require('dotenv').config();
const mongoose = require('mongoose');
const { OpenAI } = require('openai');
const { PineconeClient } = require('@pinecone-database/pinecone');
const connectDB = require('../config/db');
const User = require('../models/User');
const LawyerProfile = require('../models/LawyerProfile');

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const PINECONE_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENV = process.env.PINECONE_ENV;
const PINECONE_INDEX_LAWYERS = process.env.PINECONE_INDEX_LAWYERS || 'casemate-lawyers';

if (!OPENAI_KEY || !PINECONE_KEY || !PINECONE_ENV) {
  console.error('Missing OPENAI_API_KEY or PINECONE_API_KEY/PINECONE_ENV in environment.');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_KEY });
const pinecone = new PineconeClient();

async function init() {
  await pinecone.init({ apiKey: PINECONE_KEY, environment: PINECONE_ENV });
}

async function indexLawyers() {
  await init();
  await connectDB();
  const index = pinecone.Index(PINECONE_INDEX_LAWYERS);
  const profiles = await LawyerProfile.find({}).populate('user', 'name email');
  console.log('Found', profiles.length, 'lawyer profiles');

  const vectors = [];
  for (const p of profiles) {
    const textParts = [p.user?.name || '', (p.bio || ''), (p.specialization || []).join(', '), `rate:${p.hourlyRate || ''}`];
    const text = textParts.filter(Boolean).join('\n');
    try {
      const embRes = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text });
      const embedding = embRes.data[0].embedding;
      const id = p.user?._id?.toString() || `${p._id}`;
      vectors.push({ id, values: embedding, metadata: { userId: id, name: p.user?.name || '', specialization: p.specialization || [], summary: (p.bio || '').slice(0, 300) } });
    } catch (e) {
      console.error('Embedding error for profile', p._id, e.message || e);
    }
    if (vectors.length >= 100) {
      await index.upsert({ vectors });
      console.log('Upserted 100 lawyer vectors');
      vectors.length = 0;
    }
  }
  if (vectors.length > 0) {
    await index.upsert({ vectors });
    console.log('Upserted final', vectors.length, 'lawyer vectors');
  }
  console.log('Lawyer indexing complete');
  process.exit(0);
}

indexLawyers().catch((e) => { console.error(e); process.exit(1); });
