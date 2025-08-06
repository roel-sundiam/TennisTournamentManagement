import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../middleware/errorHandler';
import { protect } from '../middleware/auth';
import Club from '../models/Club';
import CoinTransaction from '../models/CoinTransaction';
import User from '../models/User';

const router = express.Router();

// Middleware to ensure super-admin access
const requireSuperAdmin = (req: any, res: Response, next: any) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  if (req.user.role !== 'super-admin') {
    res.status(403).json({
      success: false,
      message: 'Super-admin access required'
    });
    return;
  }

  next();
};

/**
 * Get all clubs with their coin balances (super-admin only)
 */
router.get('/clubs', protect, requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('Fetching clubs for admin coin management...');
    
    const clubs = await Club.find({})
      .select('name coinBalance subscription createdAt updatedAt')
      .sort({ name: 1 });

    console.log(`Found ${clubs.length} clubs:`, clubs.map(c => ({ id: c._id, name: c.name })));

    // Get coin statistics for each club
    const clubsWithStats = await Promise.all(clubs.map(async (club) => {
      try {
        console.log(`Processing coin stats for club: ${club.name} (${club._id})`);
        
        // Get total purchased coins
        const purchaseTransactions = await CoinTransaction.aggregate([
          {
            $match: {
              club: club._id,
              type: 'credit',
              reason: { $in: ['purchase', 'admin_credit'] }
            }
          },
          {
            $group: {
              _id: null,
              totalPurchased: { $sum: '$amount' }
            }
          }
        ]);

    // Get total used coins
    const usageTransactions = await CoinTransaction.aggregate([
      {
        $match: {
          club: club._id,
          type: 'debit'
        }
      },
      {
        $group: {
          _id: null,
          totalUsed: { $sum: '$amount' }
        }
      }
    ]);

    // Get last transaction
    const lastTransaction = await CoinTransaction.findOne({
      club: club._id
    }).sort({ createdAt: -1 });

        return {
          _id: club._id,
          name: club.name,
          balance: club.coinBalance || 0,
          subscription: club.subscription,
          totalPurchased: purchaseTransactions[0]?.totalPurchased || 0,
          totalUsed: usageTransactions[0]?.totalUsed || 0,
          lastUpdated: lastTransaction?.createdAt || club.updatedAt,
          createdAt: club.createdAt,
          updatedAt: club.updatedAt
        };
      } catch (clubError) {
        console.error(`Error processing club ${club.name}:`, clubError);
        // Return basic club info if stats fail
        return {
          _id: club._id,
          name: club.name,
          balance: club.coinBalance || 0,
          subscription: club.subscription,
          totalPurchased: 0,
          totalUsed: 0,
          lastUpdated: club.updatedAt,
          createdAt: club.createdAt,
          updatedAt: club.updatedAt
        };
      }
    }));

    res.json({
      success: true,
      clubs: clubsWithStats
    });
    
  } catch (error) {
    console.error('Error in admin coins route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch club coin data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * Get specific club coin details (super-admin only)
 */
router.get('/clubs/:clubId', protect, requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { clubId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(clubId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid club ID'
    });
    return;
  }

  const club = await Club.findById(clubId);
  if (!club) {
    res.status(404).json({
      success: false,
      message: 'Club not found'
    });
    return;
  }

  // Get detailed transaction history
  const transactions = await CoinTransaction.find({ club: clubId })
    .populate('user', 'username email')
    .sort({ createdAt: -1 })
    .limit(50);

  // Get coin statistics
  const stats = await CoinTransaction.aggregate([
    { $match: { club: new mongoose.Types.ObjectId(clubId) } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  const totalPurchased = stats.find(s => s._id === 'credit')?.total || 0;
  const totalUsed = stats.find(s => s._id === 'debit')?.total || 0;

  res.json({
    success: true,
    club: {
      _id: club._id,
      name: club.name,
      balance: club.coinBalance || 0,
      subscription: club.subscription,
      totalPurchased,
      totalUsed,
      lastUpdated: club.updatedAt
    },
    transactions,
    stats: {
      totalPurchased,
      totalUsed,
      transactionCount: transactions.length
    }
  });
}));

/**
 * Add coins to a club (super-admin only)
 */
router.post('/clubs/:clubId/add-coins', protect, requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { clubId } = req.params;
  const { amount, description } = req.body;

  // Debug logging
  console.log('Add coins request:', {
    clubId,
    body: req.body,
    amount,
    amountType: typeof amount,
    description
  });

  if (!mongoose.Types.ObjectId.isValid(clubId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid club ID'
    });
    return;
  }

  if (!amount || amount <= 0) {
    res.status(400).json({
      success: false,
      message: 'Amount must be a positive number'
    });
    return;
  }

  const club = await Club.findById(clubId);
  if (!club) {
    res.status(404).json({
      success: false,
      message: 'Club not found'
    });
    return;
  }

  // Add coins to club balance
  const previousBalance = club.coinBalance || 0;
  club.coinBalance = previousBalance + amount;
  await club.save();
  
  console.log(`Successfully updated club balance: ${previousBalance} -> ${club.coinBalance}`);

  // Create transaction record
  const transaction = new CoinTransaction({
    club: clubId,
    user: req.user!._id,
    type: 'credit',
    amount: amount,
    action: 'admin_credit',
    description: description || `Admin credit of ${amount} coins by super-admin`,
    balanceAfter: club.coinBalance,
    metadata: {
      adminAction: true,
      addedBy: req.user!._id
    }
  });

  await transaction.save();
  
  console.log(`Transaction saved successfully. Returning success response.`);

  res.json({
    success: true,
    message: `Successfully added ${amount} coins to ${club.name}`,
    club: {
      _id: club._id,
      name: club.name,
      balance: club.coinBalance,
      previousBalance: club.coinBalance - amount
    },
    transaction: {
      _id: transaction._id,
      amount: transaction.amount,
      description: transaction.description,
      createdAt: transaction.createdAt
    }
  });
}));

/**
 * Remove coins from a club (super-admin only)
 */
router.post('/clubs/:clubId/remove-coins', protect, requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { clubId } = req.params;
  const { amount, description } = req.body;

  if (!mongoose.Types.ObjectId.isValid(clubId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid club ID'
    });
    return;
  }

  if (!amount || amount <= 0) {
    res.status(400).json({
      success: false,
      message: 'Amount must be a positive number'
    });
    return;
  }

  const club = await Club.findById(clubId);
  if (!club) {
    res.status(404).json({
      success: false,
      message: 'Club not found'
    });
    return;
  }

  const currentBalance = club.coinBalance || 0;
  if (currentBalance < amount) {
    res.status(400).json({
      success: false,
      message: `Cannot remove ${amount} coins. Club only has ${currentBalance} coins.`
    });
    return;
  }

  // Remove coins from club balance
  club.coinBalance = currentBalance - amount;
  await club.save();

  // Create transaction record
  const transaction = new CoinTransaction({
    club: clubId,
    user: req.user!._id,
    type: 'debit',
    amount: amount,
    action: 'admin_debit',
    description: description || `Admin debit of ${amount} coins by super-admin`,
    balanceAfter: club.coinBalance,
    metadata: {
      adminAction: true,
      removedBy: req.user!._id
    }
  });

  await transaction.save();

  res.json({
    success: true,
    message: `Successfully removed ${amount} coins from ${club.name}`,
    club: {
      _id: club._id,
      name: club.name,
      balance: club.coinBalance,
      previousBalance: currentBalance
    },
    transaction: {
      _id: transaction._id,
      amount: transaction.amount,
      description: transaction.description,
      createdAt: transaction.createdAt
    }
  });
}));

/**
 * Set club coin balance (super-admin only)
 */
router.post('/clubs/:clubId/set-balance', protect, requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { clubId } = req.params;
  const { balance, description } = req.body;

  if (!mongoose.Types.ObjectId.isValid(clubId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid club ID'
    });
    return;
  }

  if (balance === undefined || balance < 0) {
    res.status(400).json({
      success: false,
      message: 'Balance must be a non-negative number'
    });
    return;
  }

  const club = await Club.findById(clubId);
  if (!club) {
    res.status(404).json({
      success: false,
      message: 'Club not found'
    });
    return;
  }

  const previousBalance = club.coinBalance || 0;
  const difference = balance - previousBalance;

  // Set new balance
  club.coinBalance = balance;
  await club.save();

  // Create transaction record
  if (difference !== 0) {
    const transaction = new CoinTransaction({
      club: clubId,
      user: req.user!._id,
      type: difference > 0 ? 'credit' : 'debit',
      amount: Math.abs(difference),
      action: 'admin_adjustment',
      description: description || `Admin balance adjustment: ${previousBalance} → ${balance}`,
      balanceAfter: club.coinBalance,
      metadata: {
        adminAction: true,
        adjustedBy: req.user!._id,
        previousBalance,
        newBalance: balance
      }
    });

    await transaction.save();
  }

  res.json({
    success: true,
    message: `Successfully set ${club.name} balance to ${balance} coins`,
    club: {
      _id: club._id,
      name: club.name,
      balance: club.coinBalance,
      previousBalance,
      difference
    }
  });
}));

export default router;