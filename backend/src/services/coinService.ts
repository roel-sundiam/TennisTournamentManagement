import mongoose from 'mongoose';
import Club, { IClub } from '../models/Club';
import CoinTransaction, { ICoinTransaction } from '../models/CoinTransaction';
import CoinActionConfig, { ICoinActionConfig } from '../models/CoinActionConfig';
import User from '../models/User';

export interface CoinDebitOptions {
  clubId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  action: string;
  description: string;
  metadata?: any;
}

export interface CoinCreditOptions {
  clubId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  reason: string;
  description: string;
  metadata?: any;
}

export interface CoinBalance {
  balance: number;
  lastUpdated: Date;
  monthlyAllocation: number;
  nextAllocation: Date;
}

export interface CoinSpending {
  daily: number;
  monthly: number;
  total: number;
}

class CoinService {
  /**
   * Get club's current coin balance
   */
  async getBalance(clubId: mongoose.Types.ObjectId): Promise<CoinBalance> {
    const club = await Club.findById(clubId) as IClub;
    if (!club) {
      throw new Error('Club not found');
    }

    // Check if monthly allocation is due
    if ((club as any).isMonthlyAllocationDue()) {
      (club as any).allocateMonthlyCoins();
      await club.save();
    }

    const nextAllocation = new Date(club.coinSettings.lastAllocation);
    nextAllocation.setMonth(nextAllocation.getMonth() + 1);

    return {
      balance: club.coinBalance,
      lastUpdated: club.updatedAt,
      monthlyAllocation: club.coinSettings.monthlyAllocation,
      nextAllocation
    };
  }

  /**
   * Check if club can afford an action
   */
  async canAfford(clubId: mongoose.Types.ObjectId, amount: number): Promise<boolean> {
    const club = await Club.findById(clubId) as IClub;
    if (!club) {
      throw new Error('Club not found');
    }

    // Check monthly allocation
    if ((club as any).isMonthlyAllocationDue()) {
      (club as any).allocateMonthlyCoins();
      await club.save();
    }

    return (club as any).canAfford(amount);
  }

  /**
   * Get cost for a specific action (simplified - no tiers)
   */
  async getActionCost(actionKey: string): Promise<number> {
    const cost = await (CoinActionConfig as any).getCost(actionKey);
    return cost;
  }

  /**
   * Check if user can perform action (role-based)
   */
  async canUserPerformAction(actionKey: string, userId: mongoose.Types.ObjectId): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const config = await CoinActionConfig.findOne({ actionKey, isActive: true }) as ICoinActionConfig;
    if (!config) {
      return true; // If no config, action is free
    }

    return (config as any).canUserPerformAction(user.role);
  }

  /**
   * Debit coins from club balance
   */
  async debitCoins(options: CoinDebitOptions): Promise<ICoinTransaction> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const club = await Club.findById(options.clubId).session(session) as IClub;
      if (!club) {
        throw new Error('Club not found');
      }

      // Check monthly allocation
      if ((club as any).isMonthlyAllocationDue()) {
        (club as any).allocateMonthlyCoins();
      }

      // Check if club can afford the action
      if (!(club as any).canAfford(options.amount)) {
        throw new Error('Insufficient coin balance');
      }

      // Check spending limits
      if (!(club as any).isWithinSpendingLimits(options.amount, 'single')) {
        throw new Error('Amount exceeds single action spending limit');
      }

      // Deduct coins
      (club as any).deductCoins(options.amount);
      await club.save({ session });

      // Create transaction record
      const transaction = new CoinTransaction({
        club: options.clubId,
        user: options.userId,
        amount: -options.amount, // Negative for debit
        type: 'debit',
        action: options.action,
        description: options.description,
        metadata: options.metadata,
        balanceAfter: club.coinBalance
      });

      await transaction.save({ session });
      await session.commitTransaction();

      return transaction;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Credit coins to club balance
   */
  async creditCoins(options: CoinCreditOptions): Promise<ICoinTransaction> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const club = await Club.findById(options.clubId).session(session) as IClub;
      if (!club) {
        throw new Error('Club not found');
      }

      // Add coins
      (club as any).addCoins(options.amount);
      await club.save({ session });

      // Create transaction record
      const transaction = new CoinTransaction({
        club: options.clubId,
        user: options.userId,
        amount: options.amount, // Positive for credit
        type: 'credit',
        action: options.reason,
        description: options.description,
        metadata: options.metadata,
        balanceAfter: club.coinBalance
      });

      await transaction.save({ session });
      await session.commitTransaction();

      return transaction;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get club's spending summary
   */
  async getSpendingSummary(clubId: mongoose.Types.ObjectId): Promise<CoinSpending> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dailySpending, monthlySpending, totalSpending] = await Promise.all([
      CoinTransaction.aggregate([
        {
          $match: {
            club: clubId,
            type: 'debit',
            createdAt: { $gte: startOfDay }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $abs: '$amount' } }
          }
        }
      ]),
      CoinTransaction.aggregate([
        {
          $match: {
            club: clubId,
            type: 'debit',
            createdAt: { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $abs: '$amount' } }
          }
        }
      ]),
      CoinTransaction.aggregate([
        {
          $match: {
            club: clubId,
            type: 'debit'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $abs: '$amount' } }
          }
        }
      ])
    ]);

    return {
      daily: dailySpending[0]?.total || 0,
      monthly: monthlySpending[0]?.total || 0,
      total: totalSpending[0]?.total || 0
    };
  }

  /**
   * Get club's transaction history
   */
  async getTransactionHistory(
    clubId: mongoose.Types.ObjectId,
    limit: number = 50,
    skip: number = 0
  ): Promise<ICoinTransaction[]> {
    return await CoinTransaction.find({ club: clubId })
      .populate('user', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  /**
   * Process coin purchase
   */
  async processPurchase(
    clubId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    amount: number,
    cost: number,
    paymentMethod: string,
    transactionId: string
  ): Promise<ICoinTransaction> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const club = await Club.findById(clubId).session(session) as IClub;
      if (!club) {
        throw new Error('Club not found');
      }

      // Add purchase to history
      (club as any).addPurchase(amount, cost, paymentMethod, transactionId);
      await club.save({ session });

      // Create transaction record
      const transaction = new CoinTransaction({
        club: clubId,
        user: userId,
        amount: amount,
        type: 'credit',
        action: 'purchase',
        description: `Purchased ${amount} coins for $${cost}`,
        metadata: {
          paymentMethod,
          transactionId,
          costUSD: cost
        },
        balanceAfter: club.coinBalance
      });

      await transaction.save({ session });
      await session.commitTransaction();

      return transaction;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Refund a transaction
   */
  async refundTransaction(
    transactionId: mongoose.Types.ObjectId,
    refundReason: string,
    refundUserId: mongoose.Types.ObjectId
  ): Promise<ICoinTransaction> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const originalTransaction = await CoinTransaction.findById(transactionId).session(session);
      if (!originalTransaction) {
        throw new Error('Transaction not found');
      }

      if (originalTransaction.type !== 'debit') {
        throw new Error('Can only refund debit transactions');
      }

      const club = await Club.findById(originalTransaction.club).session(session) as IClub;
      if (!club) {
        throw new Error('Club not found');
      }

      const refundAmount = Math.abs(originalTransaction.amount);
      (club as any).addCoins(refundAmount);
      await club.save({ session });

      // Create refund transaction
      const refundTransaction = new CoinTransaction({
        club: originalTransaction.club,
        user: refundUserId,
        amount: refundAmount,
        type: 'refund',
        action: `refund_${originalTransaction.action}`,
        description: `Refund: ${refundReason}`,
        metadata: {
          ...originalTransaction.metadata,
          originalTransactionId: originalTransaction._id
        },
        balanceAfter: club.coinBalance
      });

      await refundTransaction.save({ session });
      await session.commitTransaction();

      return refundTransaction;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Allocate monthly coins to all clubs
   */
  async allocateMonthlyCoins(): Promise<void> {
    const clubs = await Club.find({ isActive: true });

    for (const club of clubs) {
      if ((club as any).isMonthlyAllocationDue()) {
        const previousBalance = club.coinBalance;
        (club as any).allocateMonthlyCoins();
        await club.save();

        // Create transaction record
        const transaction = new CoinTransaction({
          club: club._id,
          user: club.adminUsers[0], // Use first admin user as the user
          amount: club.coinSettings.monthlyAllocation,
          type: 'credit',
          action: 'monthly_allocation',
          description: `Monthly coin allocation - ${club.subscription.tier} tier`,
          balanceAfter: club.coinBalance
        });

        await transaction.save();
      }
    }
  }
}

export default new CoinService();