import mongoose, { Document, Schema } from 'mongoose';

export interface ICoinActionConfig extends Document {
  actionKey: string;
  displayName: string;
  description: string;
  category: string;
  baseCost: number;
  tierCosts: {
    free: number;
    premium: number;
    enterprise: number;
  };
  isActive: boolean;
  minimumRole: string;
  createdAt: Date;
  updatedAt: Date;
}

const CoinActionConfigSchema: Schema = new Schema({
  actionKey: {
    type: String,
    required: [true, 'Action key is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z_]+$/, 'Action key must contain only lowercase letters and underscores']
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    maxlength: [100, 'Display name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['tournament', 'player', 'live_operations', 'analytics', 'communication', 'administration'],
      message: 'Category must be tournament, player, live_operations, analytics, communication, or administration'
    }
  },
  baseCost: {
    type: Number,
    required: [true, 'Base cost is required'],
    min: [0, 'Base cost cannot be negative']
  },
  tierCosts: {
    free: {
      type: Number,
      required: [true, 'Free tier cost is required'],
      min: [0, 'Free tier cost cannot be negative']
    },
    premium: {
      type: Number,
      required: [true, 'Premium tier cost is required'],
      min: [0, 'Premium tier cost cannot be negative']
    },
    enterprise: {
      type: Number,
      required: [true, 'Enterprise tier cost is required'],
      min: [0, 'Enterprise tier cost cannot be negative']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  minimumRole: {
    type: String,
    enum: {
      values: ['player', 'club-organizer', 'club-admin', 'super-admin'],
      message: 'Minimum role must be player, club-organizer, club-admin, or super-admin'
    },
    default: 'player'
  }
}, {
  timestamps: true
});

// Indexes for performance
CoinActionConfigSchema.index({ actionKey: 1 });
CoinActionConfigSchema.index({ category: 1 });
CoinActionConfigSchema.index({ isActive: 1 });

// Virtual for checking if action is free
CoinActionConfigSchema.virtual('isFree').get(function(this: ICoinActionConfig) {
  return this.baseCost === 0 && 
         this.tierCosts.free === 0 && 
         this.tierCosts.premium === 0 && 
         this.tierCosts.enterprise === 0;
});

// Method to get cost for specific tier
CoinActionConfigSchema.methods.getCostForTier = function(tier: 'free' | 'premium' | 'enterprise'): number {
  if (!this.isActive) return 0;
  return this.tierCosts[tier] || this.baseCost;
};

// Method to check if user role can perform action
CoinActionConfigSchema.methods.canUserPerformAction = function(userRole: string): boolean {
  const roleHierarchy = {
    'player': 0,
    'club-organizer': 1,
    'club-admin': 2,
    'super-admin': 3
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[this.minimumRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
};

// Static method to get all active actions by category
CoinActionConfigSchema.statics.getActiveActionsByCategory = async function(category?: string) {
  const query: any = { isActive: true };
  if (category) {
    query.category = category;
  }

  return await this.find(query).sort({ category: 1, displayName: 1 });
};

// Static method to get cost for action and tier
CoinActionConfigSchema.statics.getCost = async function(actionKey: string, tier: 'free' | 'premium' | 'enterprise' = 'free'): Promise<number> {
  const config = await this.findOne({ actionKey, isActive: true });
  if (!config) return 0;
  
  return config.getCostForTier(tier);
};

// Static method to bulk update costs
CoinActionConfigSchema.statics.bulkUpdateCosts = async function(updates: Array<{actionKey: string, tierCosts: any}>) {
  const bulkOps = updates.map(update => ({
    updateOne: {
      filter: { actionKey: update.actionKey },
      update: { $set: { tierCosts: update.tierCosts } }
    }
  }));

  return await this.bulkWrite(bulkOps);
};

// Pre-save validation
CoinActionConfigSchema.pre<ICoinActionConfig>('save', function(next) {
  // Ensure enterprise tier cost is not higher than free tier cost
  if (this.tierCosts.enterprise > this.tierCosts.free) {
    this.tierCosts.enterprise = this.tierCosts.free;
  }
  
  // Ensure premium tier cost is between enterprise and free
  if (this.tierCosts.premium > this.tierCosts.free) {
    this.tierCosts.premium = this.tierCosts.free;
  }
  if (this.tierCosts.premium < this.tierCosts.enterprise) {
    this.tierCosts.premium = this.tierCosts.enterprise;
  }
  
  next();
});

// Ensure virtual fields are serialized
CoinActionConfigSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model<ICoinActionConfig>('CoinActionConfig', CoinActionConfigSchema);