/**
 * RAG-enabled AI Legal Chatbot Service
 * - Priority: OpenAI (if key set) → Google Gemini (free, if key set) → Local doc fallback
 * - Uses local Nepal law docs for context in all modes
 *
 * Environment variables:
 * - OPENAI_API_KEY        (optional) OpenAI key for GPT-4o-mini
 * - GEMINI_API_KEY        (optional, FREE) Google Gemini key — get free at https://aistudio.google.com/app/apikey
 * - GEMINI_MODEL          (optional, default: gemini-1.5-flash)
 * - PINECONE_API_KEY / PINECONE_ENV  (optional) for vector retrieval
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const PINECONE_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENV = process.env.PINECONE_ENV;
const PINECONE_INDEX_DOCS = process.env.PINECONE_INDEX_DOCS || 'casemate-docs';
const PINECONE_INDEX_LAWYERS = process.env.PINECONE_INDEX_LAWYERS || 'casemate-lawyers';
const LAW_JURISDICTION = process.env.LAW_JURISDICTION || 'unspecified jurisdiction';
const TRIAGE_CONFIDENCE_THRESHOLD = Number(process.env.TRIAGE_CONFIDENCE_THRESHOLD || 0.72);
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const LOCAL_DOC_CHUNK_MAX_CHARS = Number(process.env.LOCAL_DOC_CHUNK_MAX_CHARS || 1200);
const LOCAL_DOC_CHUNK_OVERLAP_CHARS = Number(process.env.LOCAL_DOC_CHUNK_OVERLAP_CHARS || 180);

const TOKEN_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'have', 'from', 'your', 'you', 'are', 'was', 'were', 'will',
  'would', 'should', 'could', 'about', 'into', 'they', 'them', 'their', 'there', 'here', 'what', 'when',
  'where', 'which', 'why', 'how', 'also', 'under', 'after', 'before', 'been', 'being', 'just', 'very', 'more',
  'than', 'then', 'please', 'help', 'need', 'case', 'legal', 'law', 'laws', 'nepal', 'situation', 'hello',
  'hi', 'hey', 'main', 'event', 'happened', 'share', 'details', 'timeline', 'document', 'documents'
]);

let openaiClient = null;
let geminiModel = null;
let pinecone = null;
let pineconeInitPromise = Promise.resolve(false);
let localDocCache = null;
let openaiUnavailableReason = '';
let geminiUnavailable = false;

function slugify(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

try {
  if (OPENAI_KEY) {
    const OpenAI = require('openai');
    openaiClient = new OpenAI({ apiKey: OPENAI_KEY });
  }
} catch (e) {
  console.warn('OpenAI client not available.');
}

try {
  if (GEMINI_KEY) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    geminiModel = genAI.getGenerativeModel({
      model: DEFAULT_GEMINI_MODEL,
      generationConfig: { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens: 1500 },
    });
    console.log(`Gemini AI ready (${DEFAULT_GEMINI_MODEL}) — free tier active.`);
  }
} catch (e) {
  console.warn('Gemini client not available:', e?.message);
}

try {
  if (PINECONE_KEY && PINECONE_ENV) {
    const { PineconeClient } = require('@pinecone-database/pinecone');
    pinecone = new PineconeClient();
    pineconeInitPromise = pinecone.init({ apiKey: PINECONE_KEY, environment: PINECONE_ENV })
      .then(() => true)
      .catch((err) => {
        console.warn('Pinecone init failed — continuing with local retrieval.', err?.message || err);
        pinecone = null;
        return false;
      });
  }
} catch (e) {
  console.warn('Pinecone client not available — continuing without vector retrieval.');
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return null;
  }
}

function isOpenAIAvailable() {
  return Boolean(openaiClient) && !openaiUnavailableReason;
}

function isGeminiAvailable() {
  return Boolean(geminiModel) && !geminiUnavailable;
}

function isAnyAIAvailable() {
  return isOpenAIAvailable() || isGeminiAvailable();
}

function markOpenAIUnavailable(err) {
  const status = err?.status;
  const code = err?.code || err?.error?.code;
  if (status === 429 || code === 'insufficient_quota' || code === 'rate_limit_exceeded') {
    openaiUnavailableReason = code || `status_${status}`;
    console.warn(`OpenAI disabled for this process due to ${openaiUnavailableReason}. Using local corpus fallback.`);
    return true;
  }
  return false;
}

function chunkText(text, maxChars = LOCAL_DOC_CHUNK_MAX_CHARS, overlapChars = LOCAL_DOC_CHUNK_OVERLAP_CHARS) {
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

function parseCaseSectionsFromDoc(doc = {}) {
  const lines = String(doc.content || '').replace(/\r/g, '').split('\n');
  const sections = [];
  let current = null;

  const pushCurrent = () => {
    if (!current) return;
    const content = current.body.join('\n').trim();
    if (!content) return;
    const caseSlug = slugify(current.title || 'case');
    sections.push({
      id: `${doc.documentId}::${caseSlug}`,
      documentId: doc.documentId,
      file: doc.file,
      title: current.title,
      jurisdictionCountry: doc.jurisdictionCountry,
      jurisdictionState: doc.jurisdictionState,
      lawType: doc.lawType,
      practiceArea: doc.practiceArea,
      tags: Array.isArray(doc.tags) ? doc.tags : [],
      sourceUrl: doc.sourceUrl,
      sourceAuthority: doc.sourceAuthority,
      content,
    });
  };

  for (const line of lines) {
    const caseMatch = line.match(/^#{2,6}\s*Case\s*:\s*(.+)$/i);
    if (caseMatch) {
      pushCurrent();
      current = { title: caseMatch[1].trim(), body: [] };
      continue;
    }
    if (!current) continue;
    if (/^#{1,6}\s+/.test(line) && !/^#{2,6}\s*Case\s*:/i.test(line)) {
      pushCurrent();
      current = null;
      continue;
    }
    current.body.push(line);
  }
  pushCurrent();
  return sections;
}

function tokenize(text = '') {
  return Array.from(new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !TOKEN_STOPWORDS.has(token))
  ));
}

function getRecentUserCaseText(conversationHistory = [], turns = 8) {
  return (conversationHistory || [])
    .filter((m) => m && m.role === 'user' && typeof m.content === 'string')
    .slice(-turns)
    .map((m) => m.content)
    .join(' ');
}

function getCaseAnchorTokens(userMessage, conversationHistory = []) {
  const stopwords = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'have', 'from', 'your', 'you', 'are', 'was', 'were', 'will',
    'would', 'should', 'could', 'about', 'into', 'they', 'them', 'their', 'there', 'here', 'what', 'when',
    'where', 'which', 'why', 'how', 'also', 'under', 'after', 'before', 'been', 'being', 'just', 'very', 'more',
    'than', 'then', 'please', 'help', 'need', 'case', 'legal', 'law', 'laws', 'nepal', 'situation'
  ]);
  const raw = tokenize(`${getRecentUserCaseText(conversationHistory, 10)} ${userMessage}`);
  return raw.filter((t) => t.length >= 4 && !stopwords.has(t)).slice(0, 24);
}

function isReplyGroundedToCase(userMessage, reply, conversationHistory = []) {
  const replyText = String(reply || '').toLowerCase();
  if (!replyText) return false;

  const anchorTokens = getCaseAnchorTokens(userMessage, conversationHistory);
  if (anchorTokens.length === 0) return true;

  let matched = 0;
  for (const token of anchorTokens) {
    if (replyText.includes(token)) matched += 1;
    if (matched >= 2) return true;
  }
  return false;
}

function buildLocalCorpus() {
  if (localDocCache) return localDocCache;
  if (!fs.existsSync(DOCS_DIR)) {
    localDocCache = { documents: [], chunks: [], caseSections: [], caseOptions: [] };
    return localDocCache;
  }

  const manifestPath = path.join(DOCS_DIR, 'legal_manifest.json');
  const manifest = safeReadJson(manifestPath);
  let documents = [];

  if (manifest && Array.isArray(manifest.documents)) {
    documents = manifest.documents
      .filter((doc) => doc?.file)
      .map((doc) => {
        const filePath = path.join(DOCS_DIR, doc.file);
        if (!fs.existsSync(filePath)) return null;
        const content = fs.readFileSync(filePath, 'utf8');
        return {
          documentId: doc.documentId || path.basename(doc.file, path.extname(doc.file)),
          file: doc.file,
          title: doc.title || path.basename(doc.file),
          jurisdictionCountry: doc.jurisdictionCountry || LAW_JURISDICTION,
          jurisdictionState: doc.jurisdictionState || '',
          lawType: doc.lawType || 'general',
          practiceArea: doc.practiceArea || 'general',
          tags: Array.isArray(doc.tags) ? doc.tags : [],
          sourceUrl: doc.sourceUrl || '',
          sourceAuthority: doc.sourceAuthority || '',
          content,
        };
      })
      .filter(Boolean);
  }

  if (documents.length === 0) {
    documents = fs.readdirSync(DOCS_DIR)
      .filter((file) => file.endsWith('.md') || file.endsWith('.txt'))
      .map((file) => ({
        documentId: path.basename(file, path.extname(file)),
        file,
        title: path.basename(file, path.extname(file)),
        jurisdictionCountry: LAW_JURISDICTION,
        jurisdictionState: '',
        lawType: 'general',
        practiceArea: 'general',
        tags: [],
        sourceUrl: '',
        sourceAuthority: '',
        content: fs.readFileSync(path.join(DOCS_DIR, file), 'utf8'),
      }));
  }

  const chunks = documents.flatMap((doc) =>
    chunkText(doc.content).map((content, index) => ({
      ...doc,
      chunkIndex: index,
      content,
      searchText: `${doc.title} ${doc.practiceArea} ${doc.lawType} ${(doc.tags || []).join(' ')} ${content}`.toLowerCase(),
    }))
  );

  const caseSections = documents.flatMap((doc) => parseCaseSectionsFromDoc(doc));
  const caseOptions = caseSections.map((section) => ({
    id: section.id,
    title: section.title,
    practiceArea: section.practiceArea || 'general',
    file: section.file,
  }));

  localDocCache = { documents, chunks, caseSections, caseOptions };
  return localDocCache;
}

async function ensurePineconeReady() {
  if (!pinecone) return false;
  try {
    return await pineconeInitPromise;
  } catch (err) {
    return false;
  }
}

function formatDocContext(doc) {
  const meta = [
    doc.file ? `source=${doc.file}` : '',
    doc.title ? `title=${doc.title}` : '',
    doc.lawType ? `lawType=${doc.lawType}` : '',
    doc.practiceArea ? `practiceArea=${doc.practiceArea}` : '',
    doc.jurisdictionCountry ? `jurisdiction=${doc.jurisdictionCountry}` : '',
  ].filter(Boolean).join(' | ');
  return `[${meta}]\n${doc.content}`;
}

function scoreLocalChunk(chunk, queryTokens, practiceAreaHint) {
  let score = 0;
  const title = String(chunk.title || '').toLowerCase();
  const searchText = String(chunk.searchText || '').toLowerCase();

  if (practiceAreaHint && chunk.practiceArea === practiceAreaHint) score += 8;
  if (practiceAreaHint && title.includes(practiceAreaHint)) score += 4;

  for (const token of queryTokens) {
    if (!token) continue;
    if (title.includes(token)) score += 4;
    const occurrences = searchText.split(token).length - 1;
    if (occurrences > 0) score += Math.min(occurrences, 4);
  }

  return score;
}

function scoreCaseSection(section, queryTokens, practiceAreaHint) {
  let score = 0;
  const title = String(section.title || '').toLowerCase();
  const body = String(section.content || '').toLowerCase();
  if (practiceAreaHint && section.practiceArea === practiceAreaHint) score += 6;

  for (const token of queryTokens) {
    if (!token) continue;
    if (title.includes(token)) score += 5;
    if (body.includes(token)) score += 1;
  }
  return score;
}

function getCaseSectionById(caseId) {
  if (!caseId) return null;
  const { caseSections } = buildLocalCorpus();
  return (caseSections || []).find((section) => section.id === caseId) || null;
}

function retrieveLocalContext(userMessage, conversationHistory = [], topK = 4, options = {}) {
  const { chunks, caseSections } = buildLocalCorpus();
  if (!chunks.length) return { docs: [], mode: 'none' };

  const convoText = getRecentUserCaseText(conversationHistory, 8);
  const practiceAreaHint = extractPracticeAreaHint(`${userMessage} ${convoText}`);
  const queryTokens = tokenize(`${userMessage} ${convoText}`);

  if (options.selectedCaseId) {
    const selected = getCaseSectionById(options.selectedCaseId);
    if (selected) {
      return { docs: [formatDocContext(selected)], mode: 'local_case_selected' };
    }
  }

  let selectedCaseDoc = null;
  if (caseSections.length > 0 && queryTokens.length > 0) {
    const rankedCases = caseSections
      .map((section) => ({ section, score: scoreCaseSection(section, queryTokens, practiceAreaHint) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
    if (rankedCases.length > 0 && rankedCases[0].score >= 6) {
      selectedCaseDoc = rankedCases[0].section;
    }
  }

  const ranked = chunks
    .map((chunk) => ({ chunk, score: scoreLocalChunk(chunk, queryTokens, practiceAreaHint) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const selected = [];
  const seenDocuments = new Set();
  for (const entry of ranked) {
    if (selected.length >= topK) break;
    const uniqueKey = `${entry.chunk.documentId}:${entry.chunk.chunkIndex}`;
    if (seenDocuments.has(uniqueKey)) continue;
    seenDocuments.add(uniqueKey);
    selected.push(entry.chunk);
  }

  if (selected.length === 0 && practiceAreaHint) {
    for (const chunk of chunks) {
      if (selected.length >= topK) break;
      if (chunk.practiceArea === practiceAreaHint) selected.push(chunk);
    }
  }

  const docs = selected.map(formatDocContext);
  if (selectedCaseDoc) {
    docs.unshift(formatDocContext(selectedCaseDoc));
  }

  return { docs, mode: docs.length ? 'local' : 'none' };
}

function extractRelevantSentences(docs, queryTokens, maxItems = 4) {
  const selected = [];
  const seen = new Set();

  for (const rawDoc of docs) {
    const body = String(rawDoc || '').replace(/^\[[^\]]+\]\n/, '');
    const parts = body
      .split(/(?<=[.!?])\s+|\n+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 40);

    for (const part of parts) {
      const normalized = part.replace(/^[-*]\s+/, '').trim();
      const lower = normalized.toLowerCase();
      const isHeadingOnly = /^#{1,6}\s+/.test(normalized);
      const isCaseHeading = /^case\s*:/i.test(normalized) || /^##\s*case\s*:/i.test(normalized);
      const isPlaceholder = /\[add\s|official-source-ready draft|replace each section|source title:|authority:|url:|sections used:/i.test(normalized);
      const isInternalPolicy = /^(ai response policy|escalation conditions|official references|intake questions|safety note|status:|last reviewed:|jurisdiction:)/i.test(normalized)
        || /do not claim legal validity|do not predict outcomes|use only indexed/i.test(lower);
      const matchesToken = queryTokens.length === 0 || queryTokens.some((token) => lower.includes(token));
      if (isPlaceholder || isInternalPolicy || isHeadingOnly || isCaseHeading || !matchesToken || seen.has(lower)) continue;
      seen.add(lower);
      selected.push(normalized);
      if (selected.length >= maxItems) return selected;
    }
  }

  return selected;
}

function inferPracticeAreaFromDocs(docs = []) {
  for (const raw of docs || []) {
    const headerMatch = String(raw || '').match(/^\[([^\]]+)\]/);
    if (!headerMatch) continue;
    const meta = headerMatch[1];
    const areaMatch = meta.match(/practiceArea=([^|\]]+)/i);
    if (areaMatch && areaMatch[1]) return areaMatch[1].trim().toLowerCase();
  }
  return null;
}

function extractEmploymentIssueHint(text = '') {
  const rules = [
    { key: 'unpaid_salary', regex: /not\s+giving\s+me\s+salary|salary\s+not\s+paid|unpaid\s+salary|unpaid\s+wage|wages?\s+due|salary\s+due|pending\s+salary|didn'?t\s+pay\s+salary|haven'?t\s+been\s+paid/i },
    { key: 'termination', regex: /terminated?|fired|dismissed|retrench|notice\s+period|severance|resign/i },
    { key: 'overtime', regex: /overtime|extra\s+hours?|worked\s+late\s+hours?/i },
    { key: 'gratuity', regex: /gratuity|provident\s+fund|ssf|service\s+letter|experience\s+letter/i },
    { key: 'harassment', regex: /harass|bully|hostile|abuse|sexual\s+harassment/i },
    { key: 'leave', regex: /leave\s+refused|sick\s+leave|annual\s+leave|maternity\s+leave|pregnan/i },
  ];
  for (const r of rules) {
    if (r.regex.test(text)) return r.key;
  }
  return null;
}

function buildClarifyingQuestion(practiceAreaHint) {
  switch (practiceAreaHint) {
    case 'employment':
      return 'To give you more specific guidance: Was this a termination, unpaid salary, or workplace issue? Do you have a written employment contract and salary slips?';
    case 'family':
      return 'To give you more specific guidance: Is this about divorce, child custody, maintenance, or domestic violence? Has any court process started?';
    case 'property':
      return 'To give you more specific guidance: Is this about eviction, unpaid rent, a deposit dispute, or a property title issue? Do you have a written lease?';
    case 'criminal':
      return 'To give you more specific guidance: Is this about filing a complaint, an arrest, bail, or a court hearing? What is the current status of the matter?';
    default:
      return 'To help you better: please share the main event that happened, the timeline, any documents or notices you have received, and whether there is any immediate deadline or court date.';
  }
}

function buildCaseIntroByArea(practiceAreaHint, jurisdiction) {
  const employmentIssueHint = extractEmploymentIssueHint(jurisdiction);
  switch (practiceAreaHint) {
    case 'employment':
      if (employmentIssueHint === 'unpaid_salary') {
        return 'Based on the Nepal Labor Act 2074, here is what applies to your unpaid salary situation:';
      }
      return `Based on the Nepal Labor Act 2074, here is what applies to your employment situation:`;
    case 'family':
      return `Based on Nepal's National Civil Code 2074 and related family laws, here is what applies to your situation:`;
    case 'property':
      return `Based on Nepal's House Rent Act and tenancy laws, here is what applies to your situation:`;
    case 'criminal':
      return `Based on Nepal's Muluki Criminal Code 2074 and Criminal Procedure Code, here is what applies to your situation:`;
    default:
      return `Based on the applicable Nepal laws, here is what is relevant to your situation:`;
  }
}

function buildNextStepsByArea(practiceAreaHint, fullUserContext = '') {
  const employmentIssueHint = extractEmploymentIssueHint(fullUserContext);
  switch (practiceAreaHint) {
    case 'employment':
      if (employmentIssueHint === 'unpaid_salary') {
        return "Immediate next steps: (1) Send a written salary demand to your employer with a 7-day deadline and keep proof. (2) Collect your employment letter, salary slips/bank statements, and chats showing non-payment. (3) File a complaint at the District Labor Office within 35 days from when salary became due and request full unpaid wages plus interest.";
      }
      return 'Immediate next steps: (1) Gather your employment letter, salary slips, and any termination notice. (2) File a complaint at the nearest District Labor Office within 35 days of the incident. (3) Keep all written communications with your employer as evidence.';
    case 'family':
      return 'Immediate next steps: (1) Gather your marriage certificate, financial documents, and evidence of your dispute. (2) Visit the District Court in your area to file a petition. (3) If safety is a concern, contact the Women and Children Service Center or the nearest police station immediately for a protection order.';
    case 'property':
      return 'Immediate next steps: (1) Gather your rental agreement, rent receipts, and any written notices received. (2) If eviction is threatened, file an urgent petition in the District Court for protection of possession. (3) For rent or deposit disputes, file at the Ward Office first.';
    case 'criminal':
      return 'Immediate next steps: (1) If filing a complaint, go to the nearest police station with a written account and any evidence. (2) If arrested, contact a lawyer immediately and exercise your right to remain silent. (3) Apply for bail at your first court appearance.';
    default:
      return 'Immediate next steps: (1) Gather all documents related to your dispute. (2) Identify the correct court or authority for your type of issue. (3) Check whether there is a filing deadline (in most cases, 35 days applies for labor/urgent matters; 5 years for contract claims).';
  }
}

function buildLocalAnswer(userMessage, docs, conversationHistory = [], options = {}) {
  const convoText = getRecentUserCaseText(conversationHistory, 8);
  const fullUserContext = `${userMessage} ${convoText}`.trim();
  const practiceAreaHint = extractPracticeAreaHint(fullUserContext) || inferPracticeAreaFromDocs(docs);
  const employmentIssueHint = extractEmploymentIssueHint(`${fullUserContext}\n${(docs || []).join('\n')}`);
  const queryTokens = tokenize(fullUserContext);
  let relevantSentences = extractRelevantSentences(docs, queryTokens, 6);

  const shortPrompt = String(userMessage || '').trim().toLowerCase();
  const isVagueFollowUp = shortPrompt.length > 0
    && shortPrompt.length <= 24
    && /^(help|help me|pls help|please help|what now|now what|next|then|ok|okay|so)$/i.test(shortPrompt);

  if (practiceAreaHint === 'employment' && employmentIssueHint === 'unpaid_salary') {
    const salaryKeywords = ['salary', 'unpaid', 'wage', 'wages', 'due', 'payment'];
    const terminationTerms = /fired|terminat\w*|dismissed|notice\s+period|severance|termination\s+letter|notice\s+pay|retrench/i;
    const userMentionsTermination = /terminated?|fired|dismissed|notice\s+period|severance/i.test(fullUserContext);
    if (!userMentionsTermination) {
      relevantSentences = relevantSentences.filter((s) => !terminationTerms.test(String(s || '').toLowerCase()));
    }
    const salarySpecific = relevantSentences.filter((s) => {
      const lower = String(s || '').toLowerCase();
      const hasSalarySignal = salaryKeywords.some((k) => lower.includes(k));
      const isTerminationHeavy = terminationTerms.test(lower) && !/unpaid\s+salary|salary\s+not\s+paid|wages?\s+due|payment\s+due/i.test(lower);
      return hasSalarySignal && !isTerminationHeavy;
    });
    if (salarySpecific.length > 0) {
      relevantSentences = salarySpecific.slice(0, 6);
    }
  }
  const risk = options.risk || detectHighRiskIntent(`${userMessage}\n${convoText}`);

  if (isVagueFollowUp && practiceAreaHint === 'employment' && employmentIssueHint === 'unpaid_salary') {
    return {
      content: [
        'I can help you take action right now for unpaid salary in Nepal.',
        '',
        'Immediate steps you can do today:',
        '• Send a written demand to your employer asking for full unpaid salary within 7 days (keep screenshot/copy).',
        '• Prepare evidence: employment letter, salary slips/bank statements, attendance record, and chat/email messages.',
        '• If unpaid after 7 days, file at the District Labor Office within 35 days from salary due date and request wages plus interest.',
        '',
        'To make this specific to your case, tell me: (1) how many months salary is unpaid, (2) total amount due, and (3) whether you have salary slips or bank proof.',
        '',
        'Note: This is legal information to help you understand your situation. For binding legal advice specific to your case, please consult a licensed lawyer.'
      ].join('\n'),
      confidence: 0.62,
      escalationSuggested: false,
      escalationReason: '',
      suggestedLawyers: [],
    };
  }

  // If no docs at all, ask for more information
  if (!docs.length) {
    const intro = 'I can help you understand your legal situation under Nepal law. Please describe what happened — for example, have you been terminated from a job, received an eviction notice, or are dealing with a family dispute?';
    return {
      content: `${intro}\n\n${buildClarifyingQuestion(practiceAreaHint)}`,
      confidence: 0.32,
      escalationSuggested: risk.isHighRisk,
      escalationReason: risk.isHighRisk ? `high_risk_${risk.reason}` : 'insufficient_context',
      suggestedLawyers: [],
    };
  }

  const intro = buildCaseIntroByArea(practiceAreaHint, fullUserContext);
  const lines = [intro];

  // Add the most relevant legal sentences from the docs
  if (relevantSentences.length > 0) {
    relevantSentences.slice(0, 4).forEach((sentence) => {
      lines.push(`• ${sentence}`);
    });
  } else {
    // Fall back to a broader set without strict token matching
    const broadSentences = extractRelevantSentences(docs, [], 4);
    broadSentences.slice(0, 3).forEach((sentence) => {
      lines.push(`• ${sentence}`);
    });
  }

  // Add next steps
  lines.push('');
  lines.push(buildNextStepsByArea(practiceAreaHint, fullUserContext));

  // Ask for more case details to refine advice
  if (relevantSentences.length < 3) {
    lines.push('');
    lines.push(buildClarifyingQuestion(practiceAreaHint));
  }

  // Urgency warning
  if (risk.isHighRisk) {
    lines.push('');
    lines.push('⚠ This situation appears urgent. You should consult a lawyer as soon as possible, as missing a deadline can affect your legal rights.');
  }

  lines.push('');
  lines.push('Note: This is legal information to help you understand your situation. For binding legal advice specific to your case, please consult a licensed lawyer.');

  return {
    content: lines.join('\n'),
    confidence: risk.isHighRisk ? 0.42 : (relevantSentences.length >= 3 ? 0.65 : 0.50),
    escalationSuggested: risk.isHighRisk || relevantSentences.length < 2,
    escalationReason: risk.isHighRisk ? `high_risk_${risk.reason}` : (relevantSentences.length < 2 ? 'low_context_match' : ''),
    suggestedLawyers: [],
  };
}

function simpleFallback(userMessage, conversationHistory = [], options = {}) {
  const { docs } = retrieveLocalContext(userMessage, conversationHistory, 4, options);
  return buildLocalAnswer(userMessage, docs, conversationHistory, { risk: detectHighRiskIntent(userMessage) });
}

function detectHighRiskIntent(text = '') {
  const patterns = [
    { key: 'arrest_or_criminal', regex: /arrest|criminal\s+charge|police\s+case|jail|bail|f.i.r|fir/i },
    { key: 'hard_deadline', regex: /deadline|summons|court\s+date|hearing\s+tomorrow|urgent|within\s+\d+\s+days?|in\s+\d+\s+days?|leave\s+in\s+\d+\s+days?/i },
    { key: 'family_or_child', regex: /custody|domestic\s+violence|divorce|child\s+support/i },
    { key: 'immigration', regex: /visa|deport|immigration|asylum/i },
    { key: 'eviction_or_housing', regex: /evict|eviction|landlord|tenant\s+notice/i },
  ];
  for (const p of patterns) {
    if (p.regex.test(text)) {
      return { isHighRisk: true, reason: p.key };
    }
  }
  return { isHighRisk: false, reason: null };
}

function ensureSafetySuffix(reply = '') {
  const txt = String(reply || '').trim();
  if (!txt) return txt;
  if (/not legal advice/i.test(txt)) return txt;
  return `${txt}\n\nNote: This is general legal information, not legal advice.`;
}

async function parseJsonFromModel(text) {
  // try to extract JSON object from model text
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      const json = text.slice(start, end + 1);
      return JSON.parse(json);
    }
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

async function recommendLawyersByEmbedding(queryEmbedding, topK = 3) {
  if (!pinecone || !(await ensurePineconeReady())) return [];
  try {
    const index = pinecone.Index(PINECONE_INDEX_LAWYERS);
    const q = await index.query({ vector: queryEmbedding, topK, includeMetadata: true });
    return (q.matches || []).map((m) => ({ id: m.metadata?.userId || m.id, score: m.score, reason: m.metadata?.specialization || m.metadata?.summary || '' }));
  } catch (e) {
    console.error('recommendLawyersByEmbedding error', e);
    return [];
  }
}

function extractPracticeAreaHint(text = '') {
  const rules = [
    { key: 'criminal', regex: /\barrested?\b|bail|fir\b|police|theft|stealing|cheque.?bounce|remand|prison|jail|court.?date|charged?|cognizable|blackmail|extortion|assault|cybercrime|defamation|trafficking/i },
    { key: 'family', regex: /divorce|custody|alimony|child.?support|maintenance|domestic.?violence|marriage|separation|remarriage|adoption|inheritance/i },
    { key: 'property', regex: /tenant|landlord|rent|evict|lease|house.?rent|deposit|lockout|land.?title|boundary|lalpurja|squatter/i },
    { key: 'employment', regex: /salary|termination|fired|dismissed|workplace|labor|labour|employment|gratuity|severance|overtime|maternity|probation|retrench|bonus|provident.?fund/i },
    { key: 'contract', regex: /contract|agreement|breach|refund|consumer|defective.?product|online.?shopping|scam|insurance|bank|loan|lent|investment|partnership|medical.?negligence|manpower/i },
    { key: 'immigration', regex: /visa|deport|immigration|asylum/i },
  ];
  for (const r of rules) {
    if (r.regex.test(text)) return r.key;
  }
  return null;
}

function buildDocFilter(userMessage = '') {
  const hint = extractPracticeAreaHint(userMessage);
  const andFilters = [];

  if (LAW_JURISDICTION && LAW_JURISDICTION !== 'unspecified jurisdiction') {
    andFilters.push({ jurisdictionCountry: { $eq: LAW_JURISDICTION } });
  }
  if (hint) {
    andFilters.push({ practiceArea: { $eq: hint } });
  }

  if (andFilters.length === 0) return undefined;
  if (andFilters.length === 1) return andFilters[0];
  return { $and: andFilters };
}

async function retrieveContext(userMessage, conversationHistory = [], topK = 4, options = {}) {
  let embedding = null;
  const caseText = getRecentUserCaseText(conversationHistory, 8);
  const retrievalQuery = `${caseText}\n${userMessage}`.trim();

  if (options.selectedCaseId) {
    const selectedCase = getCaseSectionById(options.selectedCaseId);
    if (selectedCase) {
      return { docs: [formatDocContext(selectedCase)], embedding, mode: 'local_case_selected' };
    }
  }

  if (isOpenAIAvailable() && pinecone && await ensurePineconeReady()) {
    try {
      const embRes = await openaiClient.embeddings.create({ model: 'text-embedding-3-small', input: retrievalQuery || userMessage });
      embedding = embRes.data[0].embedding;
      const index = pinecone.Index(PINECONE_INDEX_DOCS);
      const filter = buildDocFilter(retrievalQuery || userMessage);
      const res = await index.query({ vector: embedding, topK, includeMetadata: true, filter });
      const docs = (res.matches || []).map((m) => {
        const md = m.metadata || {};
        return formatDocContext({
          file: md.source || 'unknown',
          title: md.title || '',
          lawType: md.lawType || '',
          practiceArea: md.practiceArea || '',
          jurisdictionCountry: md.jurisdictionCountry || '',
          content: md.text || md.content || '',
        });
      }).filter(Boolean);

      if (docs.length > 0) return { docs, embedding, mode: 'vector' };
    } catch (e) {
      markOpenAIUnavailable(e);
      console.error('retrieveContext vector error', e);
    }
  }

  const local = retrieveLocalContext(userMessage, conversationHistory, topK, options);
  return { docs: local.docs, embedding, mode: local.mode };
}

async function callOpenAIForAnswer(userMessage, convoText, docs) {
  if (!isOpenAIAvailable()) return null;
  const system = `You are CaseMate, an AI legal assistant specializing in ${LAW_JURISDICTION} law. Your job is to give specific, practical legal guidance based on the user's situation.

When the user describes their case:
1. Identify the area of law (employment, family, property/tenancy, criminal, contract, or general).
2. State which Nepal laws apply to their specific situation with relevant provisions.
3. Explain what rights and obligations apply to their case facts.
4. Give concrete, actionable next steps: what documents to gather, where to file, deadlines to watch, who to contact.
5. Flag any urgency or risk: limitation periods, court dates, custody emergencies, or detention.
6. Recommend a lawyer if the matter is complex, urgent, or high-stakes.

Be direct and specific to the case facts the user has shared. Use plain language. Cite Nepal laws (Labor Act 2074, National Civil Code 2074, Muluki Criminal Code 2074, House Rent Act, etc.) where relevant.
Do not invent case facts. If key facts are missing, ask 1-2 focused follow-up questions instead of giving broad generic advice.

End every reply with: "Note: This is legal information to help you understand your situation. For binding legal advice specific to your case, please consult a licensed lawyer."

Output strict JSON only.
Required keys: reply (string, the full response), confidence (0-1), escalationSuggested (true/false), escalationReason (string), suggestedLawyers (array of {id, score, reason}).`;
  const userPrompt = `Context documents:\n${docs.join('\n---\n')}\n\nConversation so far:\n${convoText}\n\nUser's latest message: ${userMessage}\n\nAnalyze the user's specific legal situation and respond in strict JSON as described.`;
  try {
    const completion = await openaiClient.chat.completions.create({ model: DEFAULT_OPENAI_MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: userPrompt }], max_tokens: 1200, temperature: 0.2 });
    const txt = completion.choices?.[0]?.message?.content || '';
    return parseJsonFromModel(txt);
  } catch (e) {
    markOpenAIUnavailable(e);
    console.error('callOpenAIForAnswer error', e);
    return null;
  }
}

function buildAISystemPrompt() {
  return `You are CaseMate, a friendly and knowledgeable AI legal assistant for Nepal. You help people understand their legal situation and what to do next.

Your personality: warm, clear, practical — like a knowledgeable friend who knows Nepal law well, not a stiff bureaucrat.

When someone describes their case:
1. Acknowledge their situation with empathy if it's a difficult one.
2. Identify the relevant Nepal laws (Labor Act 2074, National Civil Code 2074, Muluki Criminal Code 2074, House Rent Act 2053, Consumer Protection Act 2075, etc.).
3. Explain clearly what rights they have and what the law says about their specific situation.
4. Give specific, actionable next steps — what to do, where to go, what to bring, and any deadlines.
5. Point out any risks or urgency they should know about.
6. If you need more details to give better advice, ask a specific follow-up question.

Write in natural, conversational English. Use short paragraphs. Use bullet points for steps or lists. Be specific to their case, not generic.
Never invent details that the user did not provide. If facts are missing, ask focused questions before concluding.

Always end with: "Note: This is legal information to help you understand your situation. For formal legal advice, please consult a licensed lawyer."

Output strict JSON with keys: reply (string), confidence (number 0-1), escalationSuggested (boolean), escalationReason (string), suggestedLawyers (empty array []).`;
}

async function callGeminiForAnswer(userMessage, convoText, docs) {
  if (!isGeminiAvailable()) return null;
  const systemPrompt = buildAISystemPrompt();
  const fullPrompt = `${systemPrompt}

--- NEPAL LAW REFERENCE DOCUMENTS ---
${docs.join('\n---\n')}
--- END OF DOCUMENTS ---

Conversation so far:
${convoText}

User's message: ${userMessage}

Respond with JSON only.`;
  try {
    const result = await geminiModel.generateContent(fullPrompt);
    const txt = result.response.text();
    return parseJsonFromModel(txt);
  } catch (e) {
    geminiUnavailable = true;
    console.error('Gemini error:', e?.message || e);
    return null;
  }
}

exports.getCaseOptions = () => {
  const { caseOptions } = buildLocalCorpus();
  const grouped = (caseOptions || []).reduce((acc, option) => {
    const key = option.practiceArea || 'general';
    if (!acc[key]) acc[key] = [];
    acc[key].push(option);
    return acc;
  }, {});

  for (const key of Object.keys(grouped)) {
    grouped[key] = grouped[key].sort((a, b) => a.title.localeCompare(b.title));
  }
  return grouped;
};

exports.processMessage = async (userMessage, conversationHistory = [], options = {}) => {
  try {
    // Retrieve context and embedding
    const { docs, embedding } = await retrieveContext(userMessage, conversationHistory, 6, options);

    // Build a short convo text (last 8 messages for better context)
    const lastTurns = (conversationHistory || [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
      .slice(-8)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');
    const caseContext = getRecentUserCaseText(conversationHistory, 8);
    const risk = detectHighRiskIntent(`${userMessage}\n${caseContext}`);

    // No AI available — use local knowledge base
    if (!isAnyAIAvailable()) {
      return buildLocalAnswer(userMessage, docs, conversationHistory, { risk });
    }

    // Try OpenAI first, then Gemini
    let res = null;
    if (isOpenAIAvailable()) {
      res = await callOpenAIForAnswer(userMessage, lastTurns, docs);
    }
    if (!res && isGeminiAvailable()) {
      res = await callGeminiForAnswer(userMessage, lastTurns, docs);
    }

    let reply = res?.reply || null;
    let confidence = typeof res?.confidence === 'number' ? res.confidence : null;
    let escalationSuggested = typeof res?.escalationSuggested === 'boolean' ? res.escalationSuggested : null;
    let escalationReason = typeof res?.escalationReason === 'string' ? res.escalationReason : '';
    let suggestedLawyers = Array.isArray(res?.suggestedLawyers) ? res.suggestedLawyers : [];

    // If model didn't provide numeric confidence, estimate conservatively
    if (confidence == null) confidence = escalationSuggested ? 0.3 : 0.6;
    if (reply == null) {
      const fallback = buildLocalAnswer(userMessage, docs, conversationHistory, { risk });
      reply = fallback.content;
      confidence = fallback.confidence;
      escalationSuggested = fallback.escalationSuggested;
      escalationReason = escalationReason || fallback.escalationReason;
    }
    if (escalationSuggested == null) escalationSuggested = confidence < TRIAGE_CONFIDENCE_THRESHOLD;

    // Deterministic triage override for safety-sensitive user intents.
    if (risk.isHighRisk) {
      escalationSuggested = true;
      escalationReason = escalationReason || `high_risk_${risk.reason}`;
      confidence = Math.min(confidence, 0.45);
    }

    if (confidence < TRIAGE_CONFIDENCE_THRESHOLD) {
      escalationSuggested = true;
      escalationReason = escalationReason || 'low_confidence';
    }

    // Guardrail: if model drifts from case facts, force local grounded answer.
    if (!isReplyGroundedToCase(userMessage, reply, conversationHistory)) {
      const fallback = buildLocalAnswer(userMessage, docs, conversationHistory, { risk });
      reply = fallback.content;
      confidence = Math.min(confidence || 0.6, fallback.confidence);
      escalationSuggested = fallback.escalationSuggested || escalationSuggested;
      escalationReason = fallback.escalationReason || escalationReason || 'off_topic_model_reply';
    }

    reply = ensureSafetySuffix(reply);

    // If escalate and no suggested lawyers, run embedding-based recommender
    if (escalationSuggested && suggestedLawyers.length === 0 && embedding) {
      suggestedLawyers = await recommendLawyersByEmbedding(embedding, 3);
    }

    return { content: reply, confidence, escalationSuggested, escalationReason, suggestedLawyers };
  } catch (e) {
    console.error('processMessage RAG error', e);
    return simpleFallback(userMessage, conversationHistory, options);
  }
};
