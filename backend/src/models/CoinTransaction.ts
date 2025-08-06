import mongoose, { Document, Schema } from 'mongoose';

export interface ICoinTransaction extends Document {
  club: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  amount: number;
  type: 'debit' | 'credit' | 'refund';
  action: string;
  description: string;
  metadata?: {
    tournamentId?: mongoose.Types.ObjectId;
    playerId?: mongoose.Types.ObjectId;
    matchId?: mongoose.Types.ObjectId;
    originalTransactionId?: mongoose.Types.ObjectId;
    [key: string]: any;
  };
  balanceAfter: number;
  isProcessed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CoinTransactionSchema: Schema = new Schema({
  club: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: [true, 'Club is required for coin transaction'],
    index: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required for coin transaction']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required for coin transaction'],
    validate: {
      validator: function(value: number) {
        return value !== 0;
      },
      message: 'Amount cannot be zero'
    }
  },
  type: {
    type: String,
    enum: {
      values: ['debit', 'credit', 'refund'],
      message: 'Type must be debit, credit, or refund'
    },
    required: [true, 'Transaction type is required']
  },
  action: {
    type: String,
    required: [true, 'Action is required for coin transaction'],
    trim: true,
    maxlength: [100, 'Action cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required for coin transaction'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  metadata: {
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament'
    },
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'Player'
    },
    matchId: {
      type: Schema.Types.ObjectId,
      ref: 'Match'
    },
    originalTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'CoinTransaction'
    }
  },
  balanceAfter: {
    type: Number,
    required: [true, 'Balance after transaction is required'],
    min: [0, 'Balance cannot be negative']
  },
  isProcessed: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
CoinTransactionSchema.index({ club: 1, createdAt: -1 });
CoinTransactionSchema.index({ user: 1, createdAt: -1 });
CoinTransactionSchema.index({ club: 1, type: 1 });
CoinTransactionSchema.index({ club: 1, action: 1 });
CoinTransactionSchema.index({ 'metadata.tournamentId': 1 });
CoinTransactionSchema.index({ 'metadata.playerId': 1 });

// Virtual for checking if transaction is a debit
CoinTransactionSchema.virtual('isDebit').get(function(this: ICoinTransaction) {
  return this.type === 'debit';
});

// Virtual for checking if transaction is a credit
CoinTransactionSchema.virtual('isCredit').get(function(this: ICoinTransaction) {
  return this.type === 'credit';
});

// Virtual for absolute amount (always positive)
CoinTransactionSchema.virtual('absoluteAmount').get(function(this: ICoinTransaction) {
  return Math.abs(this.amount);
});

// Method to create refund transaction
CoinTransactionSchema.methods.createRefund = async function(refundReason: string, refundUserId: mongoose.Types.ObjectId) {
  if (this.type !== 'debit') {
    throw new Error('Can only refund debit transactions');
  }

  const refundTransaction = new (this.constructor as any)({
    club: this.club,
    user: refundUserId,
    amount: Math.abs(this.amount), // Refund as positive amount
    type: 'refund',
    action: `refund_${this.action}`,
    description: `Refund: ${refundReason}`,
    metadata: {
      ...this.metadata,
      originalTransactionId: this._id
    },
    balanceAfter: 0 // Will be calculated by coin service
  });

  return refundTransaction;
};

// Static method to get club transaction summary
CoinTransactionSchema.statics.getClubSummary = async function(clubId: mongoose.Types.ObjectId, startDate?: Date, endDate?: Date) {
  const matchQuery: any = { club: clubId };
  
  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = startDate;
    if (endDate) matchQuery.createdAt.$lte = endDate;
  }

  const summary = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);

  return summary;
};

// Static method to get action breakdown
CoinTransactionSchema.statics.getActionBreakdown = async function(clubId: mongoose.Types.ObjectId, startDate?: Date, endDate?: Date) {
  const matchQuery: any = { club: clubId, type: 'debit' };
  
  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = startDate;
    if (endDate) matchQuery.createdAt.$lte = endDate;
  }

  const breakdown = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$action',
        totalSpent: { $sum: { $abs: '$amount' } },
        count: { $sum: 1 },
        avgCost: { $avg: { $abs: '$amount' } }
      }
    },
    { $sort: { totalSpent: -1 } }
  ]);

  return breakdown;
};

// Pre-save validation
CoinTransactionSchema.pre<ICoinTransaction>('save', function(next) {
  // Ensure debit amounts are negative
  if (this.type === 'debit' && this.amount > 0) {
    this.amount = -this.amount;
  }
  
  // Ensure credit and refund amounts are positive
  if ((this.type === 'credit' || this.type === 'refund') && this.amount < 0) {
    this.amount = Math.abs(this.amount);
  }
  
  next();
});

// Ensure virtual fields are serialized
CoinTransactionSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Remove sensitive metadata from public output
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model<ICoinTransaction>('CoinTransaction', CoinTransactionSchema);