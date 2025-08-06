import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from './errorHandler';

// Extend Express Request interface to include club context
declare global {
  namespace Express {
    interface Request {
      clubId?: string;
    }
  }
}

/**
 * Middleware to extract and set club context for data filtering
 * @desc Automatically filters data by user's club
 * @access Private routes only (must be used after protect middleware)
 */
export const setClubContext = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated - club context cannot be set'
    });
    return;
  }

  // Super-admin can access all clubs, others are restricted to their club
  if (req.user.role === 'super-admin') {
    // Super-admin can optionally specify a club via query parameter
    req.clubId = req.query.clubId as string || undefined;
  } else {
    // All other users are restricted to their club
    if (!req.user.club) {
      res.status(400).json({
        success: false,
        message: 'User does not belong to any club'
      });
      return;
    }
    req.clubId = req.user.club.toString();
  }

  next();
});

/**
 * Middleware to enforce club-based data filtering
 * @desc Automatically adds club filter to database queries
 * @access Private routes only (must be used after setClubContext middleware)
 */
export const enforceClubFilter = (modelType: 'tournament' | 'player' | 'team' | 'match' | 'court' | 'all') => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Super-admin can bypass club filtering if no specific club is set
    if (req.user.role === 'super-admin' && !req.clubId) {
      next();
      return;
    }

    if (!req.clubId) {
      res.status(400).json({
        success: false,
        message: 'Club context not set'
      });
      return;
    }

    // Add club filter to request for use in route handlers
    req.query.clubId = req.clubId;

    next();
  });
};

/**
 * Helper function to get club-filtered query
 * @param baseQuery The base query object
 * @param clubId The club ID to filter by
 * @returns Query object with club filter applied
 */
export const addClubFilter = (baseQuery: any = {}, clubId?: string) => {
  if (!clubId) {
    return baseQuery;
  }
  
  return {
    ...baseQuery,
    club: clubId
  };
};

/**
 * Helper function to validate club ownership
 * @param req Express request object
 * @param resourceClubId The club ID of the resource being accessed
 * @returns Boolean indicating if user can access the resource
 */
export const canAccessClub = (req: Request, resourceClubId: string): boolean => {
  if (!req.user) {
    return false;
  }

  // Super-admin can access any club
  if (req.user.role === 'super-admin') {
    return true;
  }

  // Users can only access their own club's resources
  return req.user.club?.toString() === resourceClubId;
};

/**
 * Middleware to check if user can access a specific resource
 * @param getResourceClubId Function to extract club ID from resource
 */
export const checkClubAccess = (getResourceClubId: (req: Request) => Promise<string | null>) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const resourceClubId = await getResourceClubId(req);
    
    if (!resourceClubId) {
      res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
      return;
    }

    if (!canAccessClub(req, resourceClubId)) {
      res.status(403).json({
        success: false,
        message: 'Access denied - you can only access your club\'s resources'
      });
      return;
    }

    next();
  });
};

/**
 * Middleware to validate tournament access
 */
export const checkTournamentAccess = checkClubAccess(async (req: Request) => {
  const Tournament = require('../models/Tournament').default;
  const tournament = await Tournament.findById(req.params.id || req.params.tournamentId).select('club');
  return tournament?.club?.toString() || null;
});

/**
 * Middleware to validate player access
 */
export const checkPlayerAccess = checkClubAccess(async (req: Request) => {
  const Player = require('../models/Player').default;
  const player = await Player.findById(req.params.id).select('club');
  return player?.club?.toString() || null;
});

/**
 * Middleware to validate team access
 */
export const checkTeamAccess = checkClubAccess(async (req: Request) => {
  const Team = require('../models/Team').default;
  const team = await Team.findById(req.params.id).select('club');
  return team?.club?.toString() || null;
});

/**
 * Middleware to validate match access
 */
export const checkMatchAccess = checkClubAccess(async (req: Request) => {
  const Match = require('../models/Match').default;
  const match = await Match.findById(req.params.id).select('club');
  return match?.club?.toString() || null;
});

/**
 * Middleware to validate court access
 */
export const checkCourtAccess = checkClubAccess(async (req: Request) => {
  const Court = require('../models/Court').default;
  const court = await Court.findById(req.params.id).select('club');
  return court?.club?.toString() || null;
});