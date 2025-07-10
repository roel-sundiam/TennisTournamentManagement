import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Import models to register them with Mongoose
import './models/User';
import './models/Tournament';
import './models/Player';
import './models/PlayerRegistration';
import './models/Team';
import './models/Match';
import './models/Bracket';
// import './models/Court';  // Temporarily disabled to debug court validation
import './models/TimeSlot';
import './models/Schedule';

// Import routes
import authRoutes from './routes/auth';
import tournamentRoutes from './routes/tournaments';
import playerRoutes from './routes/players';
import playerRegistrationRoutes from './routes/playerRegistrations';
import teamRoutes from './routes/teams';
import matchRoutes from './routes/matches';
import bracketRoutes from './routes/brackets';
import courtRoutes from './routes/courts';
import schedulingRoutes from './routes/scheduling';

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/player-registrations', playerRegistrationRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/brackets', bracketRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/scheduling', schedulingRoutes);

// Temporary test route
app.post('/api/test-registration', async (req, res) => {
  console.log('Test route hit with body:', req.body);
  res.json({ success: true, message: 'Test route working' });
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