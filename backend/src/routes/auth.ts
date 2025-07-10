import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/errorHandler';
import User from '../models/User';

const router = express.Router();

// Helper function to generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'default-secret', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  } as jwt.SignOptions);
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password, firstName, lastName, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    res.status(400).json({
      success: false,
      message: 'User with this email or username already exists'
    });
    return;
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    firstName,
    lastName,
    role: role || 'organizer'
  });

  // Generate token
  const token = generateToken((user._id as any).toString());

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    token,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      role: user.role
    }
  });
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: 'Please provide email and password'
    });
    return;
  }

  // Check for user (include password for comparison)
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
    return;
  }

  // Check if user is active
  if (!user.isActive) {
    res.status(401).json({
      success: false,
      message: 'Account is deactivated'
    });
    return;
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
    return;
  }

  // Generate token
  const token = generateToken((user._id as any).toString());

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      role: user.role
    }
  });
}));

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  // For now, return mock user data since we don't have auth middleware yet
  // In production, this would extract user ID from JWT token via middleware
  
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    email: 'test@tennistournament.com',
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    role: 'organizer'
  };

  res.status(200).json({
    success: true,
    data: mockUser
  });
}));

export default router;