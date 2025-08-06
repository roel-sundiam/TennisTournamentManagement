import mongoose, { Document, Schema } from 'mongoose';

export interface IClub extends Document {
  name: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  contactInfo: {
    email?: string;
    phone?: string;
    website?: string;
  };
  settings: {
    timezone: string;
    currency: string;
    language: string;
    dateFormat: string;
  };
  branding?: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
    bannerUrl?: string;
  };
  subscription: {
    tier: 'free' | 'premium' | 'enterprise';
    maxTournaments: number;
    maxPlayers: number;
    maxCourts: number;
    features: string[];
    expiresAt?: Date;
    isActive: boolean;
  };
  adminUsers: mongoose.Types.ObjectId[];
  coinBalance: number;
  coinSettings: {
    lastAllocation: Date;
    monthlyAllocation: number;
    purchaseHistory: Array<{
      amount: number;
      cost: number;
      paymentMethod: string;
      transactionId: string;
      purchasedAt: Date;
    }>;
    spendingLimits: {
      dailyLimit: number;
      monthlyLimit: number;
      singleActionLimit: number;
    };
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClubSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Club name is required'],
    trim: true,
    maxlength: [100, 'Club name cannot exceed 100 characters']
    // unique: true  // Temporarily disabled for debugging
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [500, 'Street address cannot exceed 500 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State cannot exceed 50 characters']
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [20, 'Zip code cannot exceed 20 characters']
    }
  },
  contactInfo: {
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      // unique: true,  // Temporarily disabled
      // sparse: true,
      validate: {
        validator: function(v: string) {
          // If email is provided, it must be valid
          return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please provide a valid email'
      }
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\d\s\-\+\(\)]+$/, 'Please provide a valid phone number']
    },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+\..+/, 'Please provide a valid website URL']
    }
  },
  settings: {
    timezone: {
      type: String,
      default: 'America/New_York',
      enum: [
        'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
        'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
        'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
        'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney'
      ]
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh']
    },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY',
      enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']
    }
  },
  branding: {
    primaryColor: {
      type: String,
      default: '#27ae60',
      match: [/^#[0-9A-F]{6}$/i, 'Primary color must be a valid hex color']
    },
    secondaryColor: {
      type: String,
      default: '#2c3e50',
      match: [/^#[0-9A-F]{6}$/i, 'Secondary color must be a valid hex color']
    },
    logoUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Logo URL must be a valid URL']
    },
    bannerUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Banner URL must be a valid URL']
    }
  },
  subscription: {
    tier: {
      type: String,
      enum: {
        values: ['free', 'premium', 'enterprise'],
        message: 'Subscription tier must be free, premium, or enterprise'
      },
      default: 'free'
    },
    maxTournaments: {
      type: Number,
      default: 5,
      min: [1, 'Max tournaments must be at least 1']
    },
    maxPlayers: {
      type: Number,
      default: 100,
      min: [10, 'Max players must be at least 10']
    },
    maxCourts: {
      type: Number,
      default: 5,
      min: [1, 'Max courts must be at least 1']
    },
    features: [{
      type: String,
      enum: [
        'basic-tournaments', 'advanced-scheduling', 'live-scoring', 
        'statistics', 'custom-branding', 'api-access', 'priority-support',
        'multiple-admins', 'advanced-reports', 'integrations'
      ]
    }],
    expiresAt: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  adminUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  coinBalance: {
    type: Number,
    default: 0,
    min: [0, 'Coin balance cannot be negative']
  },
  coinSettings: {
    lastAllocation: {
      type: Date,
      default: Date.now
    },
    monthlyAllocation: {
      type: Number,
      default: 200, // Default for free tier
      min: [0, 'Monthly allocation cannot be negative']
    },
    purchaseHistory: [{
      amount: {
        type: Number,
        required: true,
        min: [1, 'Purchase amount must be at least 1']
      },
      cost: {
        type: Number,
        required: true,
        min: [0, 'Purchase cost cannot be negative']
      },
      paymentMethod: {
        type: String,
        required: true,
        enum: ['stripe', 'paypal', 'admin_credit', 'promo_code']
      },
      transactionId: {
        type: String,
        required: true
      },
      purchasedAt: {
        type: Date,
        default: Date.now
      }
    }],
    spendingLimits: {
      dailyLimit: {
        type: Number,
        default: 1000,
        min: [0, 'Daily limit cannot be negative']
      },
      monthlyLimit: {
        type: Number,
        default: 5000,
        min: [0, 'Monthly limit cannot be negative']
      },
      singleActionLimit: {
        type: Number,
        default: 100,
        min: [0, 'Single action limit cannot be negative']
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
ClubSchema.index({ name: 1 });
ClubSchema.index({ 'contactInfo.email': 1 });
ClubSchema.index({ isActive: 1 });
ClubSchema.index({ 'subscription.tier': 1 });
ClubSchema.index({ 'subscription.isActive': 1 });

// Virtual for checking if subscription is valid
ClubSchema.virtual('isSubscriptionValid').get(function(this: IClub) {
  if (!this.subscription.isActive) return false;
  if (this.subscription.tier === 'free') return true;
  if (!this.subscription.expiresAt) return true;
  return new Date() <= this.subscription.expiresAt;
});

// Virtual for getting subscription status
ClubSchema.virtual('subscriptionStatus').get(function(this: IClub) {
  if (!this.subscription.isActive) return 'inactive';
  if (this.subscription.tier === 'free') return 'active';
  if (!this.subscription.expiresAt) return 'active';
  
  const now = new Date();
  const expiresAt = new Date(this.subscription.expiresAt);
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 7) return 'expiring';
  return 'active';
});

// Virtual for full address
ClubSchema.virtual('fullAddress').get(function(this: IClub) {
  if (!this.address) return '';
  const parts = [
    this.address.street,
    this.address.city,
    this.address.state,
    this.address.zipCode
  ].filter(Boolean);
  return parts.join(', ');
});

// Method to check if club can create more tournaments
ClubSchema.methods.canCreateTournament = function(currentTournamentCount: number): boolean {
  return currentTournamentCount < this.subscription.maxTournaments;
};

// Method to check if club can add more players
ClubSchema.methods.canAddPlayer = function(currentPlayerCount: number): boolean {
  return currentPlayerCount < this.subscription.maxPlayers;
};

// Method to check if club can add more courts
ClubSchema.methods.canAddCourt = function(currentCourtCount: number): boolean {
  return currentCourtCount < this.subscription.maxCourts;
};

// Method to check if club has a specific feature
ClubSchema.methods.hasFeature = function(feature: string): boolean {
  return this.subscription.features.includes(feature);
};

// Method to add admin user
ClubSchema.methods.addAdmin = function(userId: mongoose.Types.ObjectId): void {
  if (!this.adminUsers.includes(userId)) {
    this.adminUsers.push(userId);
  }
};

// Method to remove admin user
ClubSchema.methods.removeAdmin = function(userId: mongoose.Types.ObjectId): void {
  this.adminUsers = this.adminUsers.filter((id: any) => !id.equals(userId));
};

// Method to check if club can afford an action
ClubSchema.methods.canAfford = function(amount: number): boolean {
  return this.coinBalance >= amount;
};

// Method to deduct coins
ClubSchema.methods.deductCoins = function(amount: number): void {
  if (this.coinBalance < amount) {
    throw new Error('Insufficient coin balance');
  }
  this.coinBalance -= amount;
};

// Method to add coins
ClubSchema.methods.addCoins = function(amount: number): void {
  this.coinBalance += amount;
};

// Method to check if within spending limits
ClubSchema.methods.isWithinSpendingLimits = function(amount: number, timeframe: 'daily' | 'monthly' | 'single'): boolean {
  switch (timeframe) {
    case 'single':
      return amount <= this.coinSettings.spendingLimits.singleActionLimit;
    case 'daily':
      return amount <= this.coinSettings.spendingLimits.dailyLimit;
    case 'monthly':
      return amount <= this.coinSettings.spendingLimits.monthlyLimit;
    default:
      return false;
  }
};

// Method to add purchase to history
ClubSchema.methods.addPurchase = function(amount: number, cost: number, paymentMethod: string, transactionId: string): void {
  this.coinSettings.purchaseHistory.push({
    amount,
    cost,
    paymentMethod,
    transactionId,
    purchasedAt: new Date()
  });
  this.addCoins(amount);
};

// Method to check if monthly allocation is due
ClubSchema.methods.isMonthlyAllocationDue = function(): boolean {
  const now = new Date();
  const lastAllocation = new Date(this.coinSettings.lastAllocation);
  
  // Check if it's a new month
  return now.getMonth() !== lastAllocation.getMonth() || 
         now.getFullYear() !== lastAllocation.getFullYear();
};

// Method to allocate monthly coins
ClubSchema.methods.allocateMonthlyCoins = function(): void {
  if (this.isMonthlyAllocationDue()) {
    this.addCoins(this.coinSettings.monthlyAllocation);
    this.coinSettings.lastAllocation = new Date();
  }
};

// Set default features based on subscription tier
ClubSchema.pre<IClub>('save', function(next) {
  if (this.isModified('subscription.tier')) {
    switch ((this as any).subscription.tier) {
      case 'free':
        (this as any).subscription.features = ['basic-tournaments'];
        (this as any).subscription.maxTournaments = 5;
        (this as any).subscription.maxPlayers = 100;
        (this as any).subscription.maxCourts = 5;
        (this as any).coinSettings.monthlyAllocation = 200;
        break;
      case 'premium':
        (this as any).subscription.features = [
          'basic-tournaments', 'advanced-scheduling', 'live-scoring', 
          'statistics', 'custom-branding'
        ];
        (this as any).subscription.maxTournaments = 25;
        (this as any).subscription.maxPlayers = 500;
        (this as any).subscription.maxCourts = 20;
        (this as any).coinSettings.monthlyAllocation = 1000;
        break;
      case 'enterprise':
        (this as any).subscription.features = [
          'basic-tournaments', 'advanced-scheduling', 'live-scoring', 
          'statistics', 'custom-branding', 'api-access', 'priority-support',
          'multiple-admins', 'advanced-reports', 'integrations'
        ];
        (this as any).subscription.maxTournaments = -1; // unlimited
        (this as any).subscription.maxPlayers = -1; // unlimited
        (this as any).subscription.maxCourts = -1; // unlimited
        (this as any).coinSettings.monthlyAllocation = 5000;
        break;
    }
  }
  next();
});

// Ensure virtual fields are serialized
ClubSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Remove sensitive subscription details from public output
    if (ret.subscription) {
      delete ret.subscription.expiresAt;
    }
    return ret;
  }
});

export default mongoose.model<IClub>('Club', ClubSchema);