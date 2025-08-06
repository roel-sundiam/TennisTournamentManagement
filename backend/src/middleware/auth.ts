import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { asyncHandler } from './errorHandler';
import User, { IUser } from '../models/User';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

// Interface for JWT payload
interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

/**
 * Middleware to protect routes and extract user from JWT token
 * @desc Verify JWT token and attach user to request object
 * @access Private routes only
 */
export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from "Bearer TOKEN"
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      console.log('🔐 Verifying JWT token for protected route');
      const jwtSecret = process.env.JWT_SECRET || 'default-secret';
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      console.log('✅ Token decoded successfully:', { userId: decoded.userId, exp: new Date(decoded.exp * 1000) });

      // Get user from database (exclude password)
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found - token may be invalid'
        });
        return;
      }

      // Check if user account is approved (except for super-admin)
      if (user.role !== 'super-admin' && user.approvalStatus !== 'approved') {
        res.status(403).json({
          success: false,
          message: user.approvalStatus === 'pending' 
            ? 'Your account is pending approval' 
            : 'Your account has been rejected',
          approvalStatus: user.approvalStatus
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

      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      console.error('❌ JWT verification failed:', error);
      
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: 'Token expired - please login again'
        });
        return;
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          message: 'Invalid token - please login again'
        });
        return;
      }

      res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
      return;
    }
  }

  // No token provided
  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access denied - no token provided'
    });
    return;
  }
});

/**
 * Middleware to authorize specific roles
 * @param roles Array of roles that are allowed to access the route
 * @desc Grant access to specific roles only
 * @access Private routes only (must be used after protect middleware)
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('🔍 AUTHORIZATION CHECK - URL:', req.originalUrl, 'Method:', req.method);
    console.log('🔍 AUTHORIZATION CHECK - Allowed roles:', roles);
    
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Access denied - user not authenticated'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      console.log('🚫 Authorization failed:', {
        userRole: req.user.role,
        allowedRoles: roles,
        username: req.user.username,
        url: req.originalUrl,
        method: req.method
      });
      res.status(403).json({
        success: false,
        message: `Access denied - ${req.user.role} role is not authorized for this action`
      });
      return;
    }

    console.log('✅ Authorization successful for:', req.user.role, 'on', req.originalUrl);
    next();
  };
};

/**
 * Middleware to check if user has any of the specified roles
 * @param roles Array of roles to check against
 * @desc Grant access if user has any of the specified roles
 */
export const hasAnyRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Access denied - user not authenticated'
      });
      return;
    }

    const hasRole = roles.some(role => req.user!.role === role);
    
    if (!hasRole) {
      res.status(403).json({
        success: false,
        message: `Access denied - requires one of the following roles: ${roles.join(', ')}`
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * @desc Extract user if token is provided, but don't require it
 * @access Public routes that may benefit from user context
 */
export const optionalAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const jwtSecret = process.env.JWT_SECRET || 'default-secret';
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      
      const user = await User.findById(decoded.userId).select('-password');
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Silent fail - just continue without user context
      console.log('Optional auth failed silently:', error);
    }
  }

  next();
});