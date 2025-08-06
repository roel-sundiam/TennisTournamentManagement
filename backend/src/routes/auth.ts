import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/errorHandler';
import { protect } from '../middleware/auth';
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

  // Clean email - if empty string, set to undefined
  const cleanEmail = email && email.trim() !== '' ? email : undefined;

  // Check if user already exists
  const existingQuery: any = [{ username }];
  if (cleanEmail) {
    existingQuery.push({ email: cleanEmail });
  }
  
  const existingUser = await User.findOne({
    $or: existingQuery
  });

  if (existingUser) {
    res.status(400).json({
      success: false,
      message: 'User with this email or username already exists'
    });
    return;
  }

  // Create user with pending approval status
  const userData: any = {
    username,
    email: cleanEmail,
    password,
    firstName,
    lastName,
    role: role || 'club-organizer',
    approvalStatus: role === 'super-admin' ? 'approved' : 'pending', // Auto-approve super-admin
    isActive: true
  };

  // Only super-admin can be created without a club
  if (role === 'super-admin') {
    // Super admin doesn't need a club and is auto-approved
    userData.approvedAt = new Date();
  } else {
    // For other roles, they need approval
    userData.club = undefined;
  }

  const user = await User.create(userData);

  // Generate token
  const token = generateToken((user._id as any).toString());

  res.status(201).json({
    success: true,
    message: user.approvalStatus === 'pending' 
      ? 'Registration successful! Your account is pending approval by an administrator.' 
      : 'User registered successfully',
    token,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      role: user.role,
      club: user.club,
      approvalStatus: user.approvalStatus
    }
  });
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  // Support both username and email login
  const loginField = username || email;

  // Validate input
  if (!loginField || !password) {
    res.status(400).json({
      success: false,
      message: 'Please provide username (or email) and password'
    });
    return;
  }

  // Check for user by username or email (include password for comparison)
  let user;
  if (username) {
    user = await User.findOne({ username }).select('+password');
  } else {
    user = await User.findOne({ email }).select('+password');
  }

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

  // Check if user account is approved (except for super-admin)
  if (user.role !== 'super-admin' && user.approvalStatus !== 'approved') {
    res.status(403).json({
      success: false,
      message: user.approvalStatus === 'pending' 
        ? 'Your account is pending approval by an administrator' 
        : 'Your account has been rejected',
      approvalStatus: user.approvalStatus
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

  console.log('🔐 Login successful for user:', {
    userId: user._id,
    username: user.username,
    role: user.role,
    club: user.club,
    userClubType: typeof user.club
  });

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
      role: user.role,
      club: user.club
    }
  });
}));

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, asyncHandler(async (req: Request, res: Response) => {
  // User is attached to request by protect middleware
  const user = req.user!;

  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  });
}));

export default router;