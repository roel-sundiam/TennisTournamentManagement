import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { protect, authorize } from '../middleware/auth';
import User from '../models/User';
import Club from '../models/Club';

const router = express.Router();

// @desc    Get all pending user registrations
// @route   GET /api/user-approval/pending
// @access  Private (Super Admin only)
router.get('/pending', protect, authorize('super-admin'), asyncHandler(async (req: Request, res: Response) => {
  const pendingUsers = await User.find({ approvalStatus: 'pending' })
    .select('-password')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: pendingUsers,
    count: pendingUsers.length
  });
}));

// @desc    Get all users with their approval status
// @route   GET /api/user-approval/all
// @access  Private (Super Admin only)
router.get('/all', protect, authorize('super-admin'), asyncHandler(async (req: Request, res: Response) => {
  const { status, page = 1, limit = 20 } = req.query;
  
  const filter: any = {};
  if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
    filter.approvalStatus = status;
  }

  const users = await User.find(filter)
    .select('-password')
    .populate('approvedBy', 'username firstName lastName')
    .populate('club', 'name subscription.tier address.city address.state')
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  const total = await User.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      current: Number(page),
      pages: Math.ceil(total / Number(limit)),
      total,
      limit: Number(limit)
    }
  });
}));

// @desc    Approve a user registration
// @route   PUT /api/user-approval/:userId/approve
// @access  Private (Super Admin only)
router.put('/:userId/approve', protect, authorize('super-admin'), asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { clubId } = req.body; // Optional club assignment

  const user = await User.findById(userId);

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found'
    });
    return;
  }

  if (user.approvalStatus === 'approved') {
    res.status(400).json({
      success: false,
      message: 'User is already approved'
    });
    return;
  }

  // Update user approval status
  user.approvalStatus = 'approved';
  user.approvedBy = req.user!._id as any;
  user.approvedAt = new Date();
  user.rejectionReason = undefined; // Clear any previous rejection reason

  // Assign club if provided
  if (clubId) {
    user.club = clubId;
  }

  await user.save();

  // Return updated user data
  const updatedUser = await User.findById(userId)
    .select('-password')
    .populate('approvedBy', 'username firstName lastName')
    .populate('club', 'name');

  res.status(200).json({
    success: true,
    message: 'User approved successfully',
    data: updatedUser
  });
}));

// @desc    Reject a user registration
// @route   PUT /api/user-approval/:userId/reject
// @access  Private (Super Admin only)
router.put('/:userId/reject', protect, authorize('super-admin'), asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { reason } = req.body;

  if (!reason || reason.trim() === '') {
    res.status(400).json({
      success: false,
      message: 'Rejection reason is required'
    });
    return;
  }

  const user = await User.findById(userId);

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found'
    });
    return;
  }

  if (user.approvalStatus === 'rejected') {
    res.status(400).json({
      success: false,
      message: 'User is already rejected'
    });
    return;
  }

  // Update user approval status
  user.approvalStatus = 'rejected';
  user.approvedBy = req.user!._id as any;
  user.approvedAt = new Date();
  user.rejectionReason = reason;

  await user.save();

  // Return updated user data
  const updatedUser = await User.findById(userId)
    .select('-password')
    .populate('approvedBy', 'username firstName lastName');

  res.status(200).json({
    success: true,
    message: 'User rejected successfully',
    data: updatedUser
  });
}));

// @desc    Get approval statistics
// @route   GET /api/user-approval/stats
// @access  Private (Super Admin only)
router.get('/stats', protect, authorize('super-admin'), asyncHandler(async (req: Request, res: Response) => {
  const [pending, approved, rejected, total] = await Promise.all([
    User.countDocuments({ approvalStatus: 'pending' }),
    User.countDocuments({ approvalStatus: 'approved' }),
    User.countDocuments({ approvalStatus: 'rejected' }),
    User.countDocuments()
  ]);

  res.status(200).json({
    success: true,
    data: {
      pending,
      approved,
      rejected,
      total,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0
    }
  });
}));

// @desc    Reassign user to a different club
// @route   PUT /api/user-approval/:userId/reassign
// @access  Private (Super Admin only)
router.put('/:userId/reassign', protect, authorize('super-admin'), asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { clubId } = req.body;

  if (!clubId) {
    res.status(400).json({
      success: false,
      message: 'Club ID is required for reassignment'
    });
    return;
  }

  const user = await User.findById(userId);

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found'
    });
    return;
  }

  // Check if user is approved (can only reassign approved users)
  if (user.approvalStatus !== 'approved') {
    res.status(400).json({
      success: false,
      message: 'Can only reassign approved users'
    });
    return;
  }

  // Verify the club exists
  const club = await Club.findById(clubId);
  if (!club) {
    res.status(404).json({
      success: false,
      message: 'Club not found'
    });
    return;
  }

  const oldClubId = user.club;
  
  // Update user's club assignment
  user.club = clubId;
  await user.save();

  // Return updated user data with populated club info
  const updatedUser = await User.findById(userId)
    .select('-password')
    .populate('club', 'name subscription.tier address.city address.state');

  res.status(200).json({
    success: true,
    message: `User successfully reassigned to ${club.name}`,
    data: updatedUser,
    previousClub: oldClubId
  });
}));

export default router;