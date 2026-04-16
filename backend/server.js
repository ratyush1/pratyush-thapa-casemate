const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const connectDB = require('./config/db');
const { init } = require('./utils/socket');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const lawyersRoutes = require('./routes/lawyers');
const appointmentsRoutes = require('./routes/appointments');
const paymentsRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const reviewsRoutes = require('./routes/reviews');

connectDB();
const app = express();
// CORS: set FRONTEND_URL to your frontend origin (e.g. https://casemate.vercel.app). Multiple origins: comma-separated.
const frontendOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Set CORS_ALLOW_ALL=false to re-enable strict origin checks.
const allowAllOrigins = process.env.CORS_ALLOW_ALL !== 'false';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const vercelProjectPrefixes = new Set(
  frontendOrigins
    .map((origin) => {
      try {
        const host = new URL(origin).hostname;
        if (!host.endsWith('.vercel.app')) return null;
        return host.replace('.vercel.app', '').split('-git-')[0];
      } catch {
        return null;
      }
    })
    .filter(Boolean)
);

const isAllowedVercelPreviewOrigin = (origin) => {
  if (!vercelProjectPrefixes.size) return false;

  try {
    const host = new URL(origin).hostname;
    if (!host.endsWith('.vercel.app')) return false;

    for (const prefix of vercelProjectPrefixes) {
      const re = new RegExp(`^${escapeRegExp(prefix)}(?:-[a-z0-9-]+)?\\.vercel\\.app$`, 'i');
      if (re.test(host)) return true;
    }
  } catch {
    return false;
  }

  return false;
};

const isLocalDevOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

const corsOptions = {
  origin(origin, callback) {
    if (allowAllOrigins) {
      return callback(null, true);
    }

    if (!origin) return callback(null, true);

    if (frontendOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (isAllowedVercelPreviewOrigin(origin)) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== 'production' && isLocalDevOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/lawyers', lawyersRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewsRoutes);

app.get('/api/health', (req, res) => res.json({ success: true, message: 'Casemate API running' }));

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Max 10MB.' });
  }
  res.status(500).json({ success: false, message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize socket.io with CORS allowing frontend origins
init(server, { cors: corsOptions });

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
