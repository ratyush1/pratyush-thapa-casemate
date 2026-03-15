require('dotenv').config();
const fs = require('fs');
const path = require('path');

const { OpenAI } = require('openai');
const { PineconeClient } = require('@pinecone-database/pinecone');

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const PINECONE_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENV = process.env.PINECONE_ENV;
const PINECONE_INDEX_DOCS = process.env.PINECONE_INDEX_DOCS || 'casemate-docs';
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const LAW_JURISDICTION = process.env.LAW_JURISDICTION || 'Nepal';
const CHUNK_MAX_CHARS = Number(process.env.DOC_CHUNK_MAX_CHARS || 1200);
const CHUNK_OVERLAP_CHARS = Number(process.env.DOC_CHUNK_OVERLAP_CHARS || 180);
const UPSERT_BATCH_SIZE = Number(process.env.DOC_UPSERT_BATCH_SIZE || 80);

if (!OPENAI_KEY || !PINECONE_KEY || !PINECONE_ENV) {
  console.error('Missing OPENAI_API_KEY or PINECONE_API_KEY/PINECONE_ENV in environment.');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_KEY });
const pinecone = new PineconeClient();

async function init() {
  await pinecone.init({ apiKey: PINECONE_KEY, environment: PINECONE_ENV });
}

function normalizeId(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return null;
  }
}

function chunkText(text, maxChars = CHUNK_MAX_CHARS, overlapChars = CHUNK_OVERLAP_CHARS) {
  const cleaned = String(text || '').replace(/\r/g, '').trim();
  if (!cleaned) return [];

  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + maxChars, cleaned.length);
    if (end < cleaned.length) {
      const lastBoundary = cleaned.lastIndexOf(' ', end);
      if (lastBoundary > start + Math.floor(maxChars * 0.6)) {
        end = lastBoundary;
      }
    }
    const piece = cleaned.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= cleaned.length) break;
    start = Math.max(end - overlapChars, start + 1);
  }
  return chunks;
}

function resolveCorpusFromManifest(docsDir) {
  const manifestPath = path.join(docsDir, 'legal_manifest.json');
  const manifest = safeReadJson(manifestPath);
  if (!manifest || !Array.isArray(manifest.documents)) return null;

  const corpus = [];
  for (const doc of manifest.documents) {
    if (!doc || !doc.file) continue;
    const sourcePath = path.join(docsDir, doc.file);
    if (!fs.existsSync(sourcePath)) {
      console.warn('Skipping manifest entry; file not found:', doc.file);
      continue;
    }
    const content = fs.readFileSync(sourcePath, 'utf8');
    if (!content.trim()) continue;

    const docId = normalizeId(doc.documentId || path.basename(doc.file, path.extname(doc.file)));
    corpus.push({
      documentId: docId,
      file: doc.file,
      title: doc.title || path.basename(doc.file),
      jurisdictionCountry: doc.jurisdictionCountry || LAW_JURISDICTION,
      jurisdictionState: doc.jurisdictionState || '',
      lawType: doc.lawType || 'general',
      practiceArea: doc.practiceArea || 'general',
      tags: Array.isArray(doc.tags) ? doc.tags : [],
      version: doc.version || '',
      effectiveDate: doc.effectiveDate || '',
      sourceUrl: doc.sourceUrl || '',
      sourceAuthority: doc.sourceAuthority || '',
      content,
    });
  }
  return corpus;
}

function resolveCorpusFromFiles(docsDir) {
  const files = fs.readdirSync(docsDir).filter((f) => f.endsWith('.txt') || f.endsWith('.md'));
  return files.map((file) => {
    const content = fs.readFileSync(path.join(docsDir, file), 'utf8');
    const base = path.basename(file, path.extname(file));
    return {
      documentId: normalizeId(base),
      file,
      title: base,
      jurisdictionCountry: LAW_JURISDICTION,
      jurisdictionState: '',
      lawType: 'general',
      practiceArea: 'general',
      tags: [],
      version: '',
      effectiveDate: '',
      sourceUrl: '',
      sourceAuthority: '',
      content,
    };
  });
}

async function indexDocs() {
  await init();
  const index = pinecone.Index(PINECONE_INDEX_DOCS);
  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) {
    console.error('No docs directory found at', docsDir, '\nCreate backend/docs and put legal documents (txt/md) there.');
    process.exit(1);
  }

  const corpus = resolveCorpusFromManifest(docsDir) || resolveCorpusFromFiles(docsDir);
  if (!corpus.length) {
    console.error('No legal documents found to index. Add files in backend/docs and optional legal_manifest.json.');
    process.exit(1);
  }

  console.log('Found', corpus.length, 'documents to index');

  const vectors = [];
  let totalChunks = 0;

  for (const doc of corpus) {
    const chunks = chunkText(doc.content);
    if (!chunks.length) continue;
    totalChunks += chunks.length;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const embRes = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: chunk });
        const embedding = embRes.data[0].embedding;
        const id = `${doc.documentId}_${i}`;
        vectors.push({
          id,
          values: embedding,
          metadata: {
            documentId: doc.documentId,
            source: doc.file,
            title: doc.title,
            text: chunk.slice(0, 1500),
            chunkIndex: i,
            chunkCount: chunks.length,
            jurisdictionCountry: doc.jurisdictionCountry,
            jurisdictionState: doc.jurisdictionState,
            lawType: doc.lawType,
            practiceArea: doc.practiceArea,
            tagsCsv: (doc.tags || []).join(', '),
            version: doc.version,
            effectiveDate: doc.effectiveDate,
            sourceUrl: doc.sourceUrl,
            sourceAuthority: doc.sourceAuthority,
          },
        });
      } catch (e) {
        console.error('Embedding error for', doc.file, 'chunk', i, e.message || e);
      }
      // batch upserts in groups to avoid payload limits
      if (vectors.length >= UPSERT_BATCH_SIZE) {
        await index.upsert({ vectors });
        console.log('Upserted', vectors.length, 'vectors');
        vectors.length = 0;
      }
    }
  }
  if (vectors.length > 0) {
    await index.upsert({ vectors });
    console.log('Upserted final', vectors.length, 'vectors');
  }
  console.log('Indexing complete. Total chunks indexed:', totalChunks);
}

indexDocs().catch((e) => { console.error(e); process.exit(1); });
