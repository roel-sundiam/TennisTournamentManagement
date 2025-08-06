import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { protect, authorize } from '../middleware/auth';
import { setClubContext } from '../middleware/clubFilter';
import Club from '../models/Club';
import User from '../models/User';

const router = express.Router();

// @desc    Get all clubs (super-admin only)
// @route   GET /api/clubs
// @access  Private (super-admin only)
router.get('/', protect, authorize('super-admin'), asyncHandler(async (req: Request, res: Response) => {
  const clubs = await Club.find({ isActive: true })
    .populate('adminUsers', 'firstName lastName email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: clubs.length,
    data: clubs
  });
}));

// @desc    Get current user's club
// @route   GET /api/clubs/my-club
// @access  Private
router.get('/my-club', protect, setClubContext, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user!.club) {
    res.status(404).json({
      success: false,
      message: 'User does not belong to any club'
    });
    return;
  }

  const club = await Club.findById(req.user!.club)
    .populate('adminUsers', 'firstName lastName email role');

  if (!club) {
    res.status(404).json({
      success: false,
      message: 'Club not found'
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: club
  });
}));

// @desc    Create new club
// @route   POST /api/clubs
// @access  Private (super-admin only)
router.post('/', protect, authorize('super-admin'), asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 Club creation request body:', JSON.stringify(req.body, null, 2));
  console.log('🎯 ROUTE HIT: Club creation endpoint reached');
  const { adminUser, ...clubData } = req.body;

  // Validate admin user data
  if (!adminUser || !adminUser.firstName || !adminUser.lastName) {
    res.status(400).json({
      success: false,
      message: 'Admin user information is required (firstName, lastName)'
    });
    return;
  }

  // Check if club email already exists (only if email is provided)
  if (clubData.contactInfo?.email) {
    const existingClub = await Club.findOne({ 'contactInfo.email': clubData.contactInfo.email });
    if (existingClub) {
      res.status(400).json({
        success: false,
        message: 'Club with this email already exists'
      });
      return;
    }
  }

  // Check if admin user email already exists (only if email is provided)
  if (adminUser.email) {
    const existingUser = await User.findOne({ email: adminUser.email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }
  }

  try {
    // Clean up club data - completely remove email field if empty
    const cleanClubData = { ...clubData };
    if (cleanClubData.contactInfo) {
      if (!clubData.contactInfo?.email || clubData.contactInfo.email.trim() === '') {
        delete cleanClubData.contactInfo.email;
      }
    }
    
    // Create the club first
    console.log('🔍 About to create club with data:', JSON.stringify(cleanClubData, null, 2));
    const club = await Club.create(cleanClubData);
    console.log('✅ Club created successfully:', club._id);

    // Create the admin user and associate with the club
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const cleanFirstName = adminUser.firstName.trim().replace(/\s+/g, '');
    const cleanLastName = adminUser.lastName.trim().replace(/\s+/g, '');
    const username = adminUser.email || `${cleanFirstName.toLowerCase()}.${cleanLastName.toLowerCase()}.admin.${timestamp}.${randomSuffix}`;
    const password = adminUser.password || 'ChangeMe123!'; // Default password
    
    // Clean up adminUser data - trim names and remove empty email
    const cleanAdminUser = { 
      ...adminUser,
      firstName: adminUser.firstName.trim(),
      lastName: adminUser.lastName.trim()
    };
    if (!adminUser.email || adminUser.email.trim() === '') {
      delete cleanAdminUser.email;
    }
    
    console.log('🔍 About to create user with data:', { ...cleanAdminUser, username, club: club._id });
    
    // Check if username already exists
    const existingUsername = await User.findOne({ username: username });
    if (existingUsername) {
      console.log(`❌ Username "${username}" already exists for user: ${existingUsername.firstName} ${existingUsername.lastName}`);
      res.status(400).json({
        success: false,
        message: `Username "${username}" is already taken. Please try again or contact support.`
      });
      return;
    }
    
    const user = await User.create({
      ...cleanAdminUser,
      club: club._id as any,
      role: 'club-admin',
      username: username,
      password: password,
      approvalStatus: 'approved', // Auto-approve admin users created during club creation
      approvedBy: req.user!._id,
      approvedAt: new Date()
    });

    // Add the user to club's admin users
    club.adminUsers.push(user._id as any);
    await club.save();

    // Populate the club with admin user data for response
    await club.populate('adminUsers', 'firstName lastName email role');

    const response = {
      success: true,
      data: club,
      adminCredentials: {
        username: username,
        password: password,
        email: adminUser.email || 'Not provided'
      },
      message: 'Club and admin user created successfully'
    };
    
    console.log('✅ Sending success response with credentials:', JSON.stringify(response.adminCredentials, null, 2));
    res.status(201).json(response);
  } catch (error: any) {
    // If there's an error, clean up any created records
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    } else if (error.code === 11000) {
      console.error('🔍 Duplicate key error:', error);
      const duplicateField = Object.keys(error.keyPattern || {})[0] || 'unknown field';
      const duplicateValue = Object.values(error.keyValue || {})[0] || 'unknown value';
      
      res.status(400).json({
        success: false,
        message: `Duplicate field value entered: ${duplicateField} = "${duplicateValue}"`
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Server error creating club'
      });
    }
  }
}));

// @desc    Get club by ID
// @route   GET /api/clubs/:id
// @access  Private (super-admin or club members)
router.get('/:id', protect, asyncHandler(async (req: Request, res: Response) => {
  const club = await Club.findById(req.params.id)
    .populate('adminUsers', 'firstName lastName email role');

  if (!club) {
    res.status(404).json({
      success: false,
      message: 'Club not found'
    });
    return;
  }

  // Check if user can access this club
  if (req.user!.role !== 'super-admin' && req.user!.club?.toString() !== (club._id as any).toString()) {
    res.status(403).json({
      success: false,
      message: 'Access denied - you can only access your own club'
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: club
  });
}));

// @desc    Update club
// @route   PUT /api/clubs/:id
// @access  Private (super-admin or club-admin)
router.put('/:id', protect, asyncHandler(async (req: Request, res: Response) => {
  let club = await Club.findById(req.params.id);

  if (!club) {
    res.status(404).json({
      success: false,
      message: 'Club not found'
    });
    return;
  }

  // Check if user can update this club
  const canUpdate = req.user!.role === 'super-admin' || 
                   (req.user!.club?.toString() === (club._id as any).toString() && 
                    req.user!.role === 'club-admin');

  if (!canUpdate) {
    res.status(403).json({
      success: false,
      message: 'Access denied - only club admins can update their club'
    });
    return;
  }

  // Prevent updating certain fields unless super-admin
  if (req.user!.role !== 'super-admin') {
    delete req.body.subscription;
    delete req.body.adminUsers;
    delete req.body.isActive;
  }

  club = await Club.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  ).populate('adminUsers', 'firstName lastName email role');

  res.status(200).json({
    success: true,
    data: club
  });
}));

// @desc    Delete club (deactivate)
// @route   DELETE /api/clubs/:id
// @access  Private (super-admin only)
router.delete('/:id', protect, authorize('super-admin'), asyncHandler(async (req: Request, res: Response) => {
  const club = await Club.findById(req.params.id);

  if (!club) {
    res.status(404).json({
      success: false,
      message: 'Club not found'
    });
    return;
  }

  // Deactivate instead of deleting
  club.isActive = false;
  await club.save();

  // Also deactivate all club users
  await User.updateMany(
    { club: club._id as any },
    { isActive: false }
  );

  res.status(200).json({
    success: true,
    message: 'Club deactivated successfully'
  });
}));

// @desc    Add admin user to club
// @route   POST /api/clubs/:id/admins
// @access  Private (super-admin or club-admin)
router.post('/:id/admins', protect, asyncHandler(async (req: Request, res: Response) => {
  const club = await Club.findById(req.params.id);

  if (!club) {
    res.status(404).json({
      success: false,
      message: 'Club not found'
    });
    return;
  }

  // Check if user can add admins to this club
  const canAddAdmin = req.user!.role === 'super-admin' || 
                     (req.user!.club?.toString() === (club._id as any).toString() && 
                      req.user!.role === 'club-admin');

  if (!canAddAdmin) {
    res.status(403).json({
      success: false,
      message: 'Access denied - only club admins can add administrators'
    });
    return;
  }

  const { email, firstName, lastName, password, role = 'club-organizer' } = req.body;

  // Validate input
  if (!email || !firstName || !lastName || !password) {
    res.status(400).json({
      success: false,
      message: 'Email, first name, last name, and password are required'
    });
    return;
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
    return;
  }

  try {
    // Create new user
    const user = await User.create({
      email,
      firstName,
      lastName,
      password,
      username: email,
      role: role === 'club-admin' ? 'club-admin' : 'club-organizer',
      club: club._id
    });

    // Add to club's admin users if they're an admin
    if (role === 'club-admin') {
      club.adminUsers.push(user._id as any);
      await club.save();
    }

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      message: 'User added to club successfully'
    });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Server error creating user'
      });
    }
  }
}));

// @desc    Get club statistics
// @route   GET /api/clubs/:id/stats
// @access  Private (super-admin or club members)
router.get('/:id/stats', protect, asyncHandler(async (req: Request, res: Response) => {
  const club = await Club.findById(req.params.id);

  if (!club) {
    res.status(404).json({
      success: false,
      message: 'Club not found'
    });
    return;
  }

  // Check if user can access this club
  if (req.user!.role !== 'super-admin' && req.user!.club?.toString() !== (club._id as any).toString()) {
    res.status(403).json({
      success: false,
      message: 'Access denied - you can only access your own club statistics'
    });
    return;
  }

  // Get statistics from other models
  const Tournament = require('../models/Tournament').default;
  const Player = require('../models/Player').default;
  const Match = require('../models/Match').default;
  const Court = require('../models/Court').default;

  const [tournamentCount, playerCount, matchCount, courtCount, activeUsers] = await Promise.all([
    Tournament.countDocuments({ club: club._id as any }),
    Player.countDocuments({ club: club._id, isActive: true }),
    Match.countDocuments({ club: club._id as any }),
    Court.countDocuments({ club: club._id, isActive: true }),
    User.countDocuments({ club: club._id, isActive: true })
  ]);

  const stats = {
    tournaments: {
      total: tournamentCount,
      limit: club.subscription.maxTournaments === -1 ? 'Unlimited' : club.subscription.maxTournaments
    },
    players: {
      total: playerCount,
      limit: club.subscription.maxPlayers === -1 ? 'Unlimited' : club.subscription.maxPlayers
    },
    courts: {
      total: courtCount,
      limit: club.subscription.maxCourts === -1 ? 'Unlimited' : club.subscription.maxCourts
    },
    matches: {
      total: matchCount
    },
    users: {
      total: activeUsers
    },
    subscription: {
      tier: club.subscription.tier,
      status: club.subscription.isActive,
      features: club.subscription.features
    }
  };

  res.status(200).json({
    success: true,
    data: stats
  });
}));

export default router;