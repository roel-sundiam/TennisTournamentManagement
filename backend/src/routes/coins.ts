import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../middleware/errorHandler';
import { protect } from '../middleware/auth';
import CoinService from '../services/coinService';
import CoinActionConfig from '../models/CoinActionConfig';
import CoinTransaction from '../models/CoinTransaction';
import Club from '../models/Club';

const router = express.Router();

/**
 * Get current club's coin balance
 */
router.get('/balance', protect, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const club = await Club.findById(user.club);
  
  if (!club) {
    res.status(404).json({
      success: false,
      message: 'Club not found'
    });
    return;
  }

  const balance = {
    clubId: club._id,
    clubName: club.name,
    balance: club.coinBalance || 0,
    subscriptionTier: club.subscription?.tier || 'free',
    monthlyAllocation: club.coinSettings?.monthlyAllocation || 0,
    lastUpdated: new Date()
  };

  res.json({
    success: true,
    balance
  });
}));

/**
 * Get coin transaction history
 */
router.get('/transactions', protect, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const limit = parseInt(req.query.limit as string) || 50;
  const page = parseInt(req.query.page as string) || 1;
  const skip = (page - 1) * limit;

  const transactions = await CoinTransaction.find({ club: user.club })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'username firstName lastName');

  res.json({
    success: true,
    transactions,
    pagination: {
      page,
      limit,
      hasMore: transactions.length === limit
    }
  });
}));

/**
 * Get available coin action configurations
 */
router.get('/actions', protect, asyncHandler(async (req: Request, res: Response) => {
  const actions = await CoinActionConfig.find({ enabled: true }).sort({ category: 1, name: 1 });
  
  res.json({
    success: true,
    actions
  });
}));

/**
 * Get cost for a specific action
 */
router.get('/cost/:action', protect, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { action } = req.params;
  
  const club = await Club.findById(user.club);
  if (!club) {
    res.status(404).json({
      success: false,
      message: 'Club not found'
    });
    return;
  }

  const cost = await CoinService.getActionCost(action);
  
  res.json({
    success: true,
    cost,
    action,
    subscriptionTier: club.subscription?.tier || 'free'
  });
}));

/**
 * Check if club can afford a specific action
 */
router.get('/check/:action', protect, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { action } = req.params;
  
  const club = await Club.findById(user.club);
  if (!club) {
    res.status(404).json({
      success: false,
      message: 'Club not found'
    });
    return;
  }

  const cost = await CoinService.getActionCost(action);
  const balance = club.coinBalance || 0;
  const canAfford = balance >= cost;
  
  res.json({
    success: true,
    canAfford,
    cost,
    balance,
    action
  });
}));

/**
 * Get available purchase packages
 */
router.get('/packages', protect, asyncHandler(async (req: Request, res: Response) => {
  // Static packages for now - could be moved to database
  const packages = [
    {
      id: 'starter',
      name: 'Starter Pack',
      coins: 100,
      price: 9.99,
      bonus: 0
    },
    {
      id: 'popular',
      name: 'Popular Pack',
      coins: 500,
      price: 39.99,
      bonus: 50,
      popular: true
    },
    {
      id: 'pro',
      name: 'Pro Pack',
      coins: 1000,
      price: 69.99,
      bonus: 150
    },
    {
      id: 'enterprise',
      name: 'Enterprise Pack',
      coins: 5000,
      price: 299.99,
      bonus: 1000
    }
  ];

  res.json({
    success: true,
    packages
  });
}));

/**
 * Purchase coins (placeholder for payment integration)
 */
router.post('/purchase', protect, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { packageId, paymentMethod, paymentToken } = req.body;

  // TODO: Implement actual payment processing with Stripe/PayPal
  // This is a placeholder implementation
  
  const packages: { [key: string]: { coins: number; bonus: number; price: number } } = {
    'starter': { coins: 100, bonus: 0, price: 9.99 },
    'popular': { coins: 500, bonus: 50, price: 39.99 },
    'pro': { coins: 1000, bonus: 150, price: 69.99 },
    'enterprise': { coins: 5000, bonus: 1000, price: 299.99 }
  };

  const selectedPackage = packages[packageId];
  if (!selectedPackage) {
    res.status(400).json({
      success: false,
      message: 'Invalid package selected'
    });
    return;
  }

  // Simulate payment processing
  if (!paymentToken) {
    res.status(400).json({
      success: false,
      message: 'Payment token required'
    });
    return;
  }

  const totalCoins = selectedPackage.coins + selectedPackage.bonus;
  
  // Credit coins to club using the correct API
  const transaction = await CoinService.creditCoins({
    clubId: user.club as mongoose.Types.ObjectId,
    userId: user._id as mongoose.Types.ObjectId,
    amount: totalCoins,
    reason: 'coin_purchase',
    description: `Purchased ${selectedPackage.coins} coins + ${selectedPackage.bonus} bonus`,
    metadata: {
      packageId,
      paymentMethod,
      price: selectedPackage.price,
      baseCoins: selectedPackage.coins,
      bonusCoins: selectedPackage.bonus
    }
  });

  res.json({
    success: true,
    transaction,
    message: `Successfully purchased ${totalCoins} coins!`
  });
}));

/**
 * Refresh coin balance (manually trigger balance update)
 */
router.post('/refresh', protect, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const club = await Club.findById(user.club);
  
  if (!club) {
    res.status(404).json({
      success: false,
      message: 'Club not found'
    });
    return;
  }

  const balance = {
    clubId: club._id,
    clubName: club.name,
    balance: club.coinBalance || 0,
    subscriptionTier: club.subscription?.tier || 'free',
    monthlyAllocation: club.coinSettings?.monthlyAllocation || 0,
    lastUpdated: new Date()
  };

  res.json({
    success: true,
    balance,
    message: 'Balance refreshed successfully'
  });
}));

export default router;