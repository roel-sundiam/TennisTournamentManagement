import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Import models to register them with Mongoose
import './models/User';
import './models/Club';
import './models/Tournament';
import './models/Player';
import './models/PlayerRegistration';
import './models/Team';
import './models/Match';
import './models/Bracket';
import './models/Court';
import './models/TimeSlot';
import './models/Schedule';
import './models/CoinTransaction';
import './models/CoinActionConfig';

// Import routes
import authRoutes from './routes/auth';
import userApprovalRoutes from './routes/userApproval';
import clubRoutes from './routes/clubs';
import tournamentRoutes from './routes/tournaments';
import playerRoutes from './routes/players';
import playerRegistrationRoutes from './routes/playerRegistrations';
import teamRoutes from './routes/teams';
import matchRoutes from './routes/matches';
import bracketRoutes from './routes/brackets';
import courtRoutes from './routes/courts';
import schedulingRoutes from './routes/scheduling';
import coinRoutes from './routes/coins';
import debugCoinRoutes from './routes/debug-coins';
import adminCoinRoutes from './routes/admin-coins';

// Load environment variables
dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:4200",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log all requests
app.use((req, res, next) => {
  if (req.path.includes('/api/teams')) {
    console.log('🔍 TEAM API REQUEST:', req.method, req.path);
    console.log('🔍 Headers:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('🔍 Request body keys:', Object.keys(req.body || {}));
  }
  if (req.method === 'POST' && req.path.includes('/bulk')) {
    console.log('🚨 BULK REQUEST DETECTED:', req.method, req.path);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/admin/coins', adminCoinRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/user-approval', userApprovalRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/player-registrations', playerRegistrationRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/brackets', bracketRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/scheduling', schedulingRoutes);
app.use('/api/coins', coinRoutes);
app.use('/api/debug/coins', debugCoinRoutes);

// Temporary test route
app.post('/api/test-registration', async (req, res) => {
  console.log('Test route hit with body:', req.body);
  res.json({ success: true, message: 'Test route working' });
});

// Debug auth route
app.get('/api/debug/auth', (req: express.Request, res: express.Response) => {
  console.log('🔍 Debug Auth Headers:', req.headers.authorization);
  console.log('🔍 All Headers:', req.headers);
  
  if (!req.headers.authorization) {
    res.status(401).json({ 
      success: false, 
      message: 'No Authorization header found',
      headers: req.headers
    });
    return;
  }
  
  if (!req.headers.authorization.startsWith('Bearer ')) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid Authorization header format',
      authHeader: req.headers.authorization
    });
    return;
  }
  
  res.json({ 
    success: true, 
    message: 'Auth header received correctly',
    authHeader: req.headers.authorization.substring(0, 20) + '...' // Hide full token
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000; // Restart trigger

app.listen(PORT, () => {
  console.log(`🎾 Tennis Tournament Management Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Frontend URL: ${process.env.CORS_ORIGIN}`);
});

export default app;
