import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from './errorHandler';
import coinService from '../services/coinService';

// Extend Express Request interface to include coin context
declare global {
  namespace Express {
    interface Request {
      coinCost?: number;
      coinAction?: string;
      coinProcessed?: boolean;
    }
  }
}

/**
 * Middleware to validate coin balance before action
 * @param actionKey The action key to check cost for
 * @param customDescription Optional custom description for the transaction
 */
export const validateCoins = (actionKey: string, customDescription?: string) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Super-admin actions are free
    if (req.user.role === 'super-admin') {
      req.coinCost = 0;
      req.coinAction = actionKey;
      next();
      return;
    }

    if (!req.user.club) {
      res.status(400).json({
        success: false,
        message: 'User does not belong to any club'
      });
      return;
    }

    try {
      // Check if user can perform this action (role-based)
      const canPerform = await coinService.canUserPerformAction(actionKey, req.user._id as mongoose.Types.ObjectId);
      if (!canPerform) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to perform this action'
        });
        return;
      }

      // Get action cost
      const cost = await coinService.getActionCost(actionKey);
      req.coinCost = cost;
      req.coinAction = actionKey;

      // If action is free, proceed
      if (cost === 0) {
        next();
        return;
      }

      // Check if club can afford the action
      const canAfford = await coinService.canAfford(req.user.club as mongoose.Types.ObjectId, cost);
      if (!canAfford) {
        const balance = await coinService.getBalance(req.user.club as mongoose.Types.ObjectId);
        res.status(402).json({
          success: false,
          message: 'Insufficient coin balance',
          error: {
            code: 'INSUFFICIENT_COINS',
            required: cost,
            available: balance.balance,
            shortage: cost - balance.balance
          }
        });
        return;
      }

      console.log(`💰 Coin validation passed - Action: ${actionKey}, Cost: ${cost} coins`);
      next();
    } catch (error) {
      console.error('❌ Coin validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error validating coin balance'
      });
    }
  });
};

/**
 * Middleware to process coin deduction after successful action
 * Must be used after validateCoins middleware
 */
export const processCoins = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Skip if already processed or no cost
  if (req.coinProcessed || !req.coinCost || req.coinCost === 0) {
    next();
    return;
  }

  // Skip for super-admin
  if (req.user?.role === 'super-admin') {
    next();
    return;
  }

  if (!req.user?.club || !req.coinAction) {
    next();
    return;
  }

  try {
    // Extract metadata from request
    const metadata: any = {};
    if (req.params.id) metadata.resourceId = req.params.id;
    if (req.params.tournamentId) metadata.tournamentId = req.params.tournamentId;
    if (req.params.playerId) metadata.playerId = req.params.playerId;
    if (req.params.matchId) metadata.matchId = req.params.matchId;

    // Process coin deduction
    await coinService.debitCoins({
      clubId: req.user.club as mongoose.Types.ObjectId,
      userId: req.user._id as mongoose.Types.ObjectId,
      amount: req.coinCost,
      action: req.coinAction,
      description: `${req.coinAction.replace(/_/g, ' ')} action`,
      metadata
    });

    req.coinProcessed = true;
    console.log(`💰 Coins processed - Deducted ${req.coinCost} coins for ${req.coinAction}`);
    next();
  } catch (error) {
    console.error('❌ Coin processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing coin transaction'
    });
  }
});

/**
 * Middleware to add coin information to response
 */
export const addCoinInfo = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.club) {
    next();
    return;
  }

  try {
    const balance = await coinService.getBalance(req.user.club as mongoose.Types.ObjectId);
    
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to add coin info
    res.json = function(data: any) {
      // Add coin information to response
      const enhancedData = {
        ...data,
        coinInfo: {
          balance: balance.balance,
          actionCost: req.coinCost || 0,
          actionProcessed: req.coinProcessed || false
        }
      };
      
      // Call original json method
      return originalJson.call(this, enhancedData);
    };
    
    next();
  } catch (error) {
    // Don't block the response if coin info fails
    console.error('❌ Error adding coin info:', error);
    next();
  }
});

/**
 * Middleware to handle coin insufficient errors globally
 */
export const handleCoinErrors = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error.message === 'Insufficient coin balance') {
    res.status(402).json({
      success: false,
      message: 'Insufficient coin balance',
      error: {
        code: 'INSUFFICIENT_COINS',
        action: req.coinAction,
        cost: req.coinCost
      }
    });
    return;
  }

  if (error.message?.includes('spending limit')) {
    res.status(400).json({
      success: false,
      message: 'Spending limit exceeded',
      error: {
        code: 'SPENDING_LIMIT_EXCEEDED',
        action: req.coinAction,
        cost: req.coinCost
      }
    });
    return;
  }

  next(error);
};

/**
 * Utility function to combine validation and processing
 */
export const requireCoins = (actionKey: string, customDescription?: string) => {
  return [
    validateCoins(actionKey, customDescription),
    processCoins
  ];
};

/**
 * Utility function for actions that should show coin info but not charge
 */
export const showCoinInfo = (actionKey: string) => {
  return [
    validateCoins(actionKey),
    addCoinInfo
  ];
};

export default {
  validateCoins,
  processCoins,
  addCoinInfo,
  handleCoinErrors,
  requireCoins,
  showCoinInfo
};