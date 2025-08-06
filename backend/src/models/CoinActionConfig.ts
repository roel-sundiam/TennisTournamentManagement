import mongoose, { Document, Schema } from 'mongoose';

export interface ICoinActionConfig extends Document {
  action: string;
  name: string;
  description: string;
  category: string;
  cost: number;
  requiredRole: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CoinActionConfigSchema: Schema = new Schema({
  action: {
    type: String,
    required: [true, 'Action is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z_]+$/, 'Action must contain only lowercase letters and underscores']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
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
  cost: {
    type: Number,
    required: [true, 'Cost is required'],
    min: [0, 'Cost cannot be negative']
  },
  requiredRole: {
    type: String,
    enum: {
      values: ['player', 'club-organizer', 'club-admin', 'super-admin'],
      message: 'Required role must be player, club-organizer, club-admin, or super-admin'
    },
    default: 'player'
  },
  enabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
CoinActionConfigSchema.index({ action: 1 });
CoinActionConfigSchema.index({ category: 1 });
CoinActionConfigSchema.index({ enabled: 1 });

// Virtual for checking if action is free
CoinActionConfigSchema.virtual('isFree').get(function(this: ICoinActionConfig) {
  return this.cost === 0;
});

// Method to check if user role can perform action
CoinActionConfigSchema.methods.canUserPerformAction = function(userRole: string): boolean {
  const roleHierarchy = {
    'player': 0,
    'club-organizer': 1,
    'club-admin': 2,
    'super-admin': 3
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[this.requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
};

// Static method to get all active actions by category
CoinActionConfigSchema.statics.getActiveActionsByCategory = async function(category?: string) {
  const query: any = { enabled: true };
  if (category) {
    query.category = category;
  }

  return await this.find(query).sort({ category: 1, name: 1 });
};

// Static method to get cost for action (simplified - no tiers)
CoinActionConfigSchema.statics.getCost = async function(actionKey: string): Promise<number> {
  const config = await this.findOne({ action: actionKey, enabled: true });
  if (!config) return 0;
  
  return config.cost;
};

// Static method to get action config
CoinActionConfigSchema.statics.getActionConfig = async function(actionKey: string) {
  return await this.findOne({ action: actionKey, enabled: true });
};

// Ensure virtual fields are serialized
CoinActionConfigSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model<ICoinActionConfig>('CoinActionConfig', CoinActionConfigSchema);