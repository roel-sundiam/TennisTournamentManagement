import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import CoinActionConfig from '../models/CoinActionConfig';

const router = express.Router();

/**
 * DEBUG: Get all coin actions (no auth required)
 */
router.get('/actions', asyncHandler(async (req: Request, res: Response) => {
  const actions = await CoinActionConfig.find({}).sort({ action: 1 });
  
  res.json({
    success: true,
    count: actions.length,
    actions: actions.map(action => ({
      action: action.action,
      name: action.name,
      cost: action.cost,
      category: action.category,
      enabled: action.enabled
    }))
  });
}));

/**
 * DEBUG: Get specific action cost (no auth required)
 */
router.get('/cost/:action', asyncHandler(async (req: Request, res: Response) => {
  const { action } = req.params;
  
  const actionConfig = await CoinActionConfig.findOne({ action, enabled: true });
  
  if (!actionConfig) {
    res.status(404).json({
      success: false,
      message: `Action '${action}' not found or disabled`
    });
    return;
  }
  
  res.json({
    success: true,
    action: actionConfig.action,
    name: actionConfig.name,
    cost: actionConfig.cost,
    category: actionConfig.category
  });
}));

export default router;