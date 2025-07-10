import mongoose, { Document, Schema } from 'mongoose';

export interface ICourt extends Document {
  name: string;
  type: 'indoor' | 'outdoor';
  status: 'available' | 'maintenance' | 'reserved';
  location?: string;
  isActive: boolean;
  notes?: string;
  capacity?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CourtSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Court name is required'],
    trim: true,
    maxlength: [50, 'Court name cannot exceed 50 characters'],
    unique: true
  },
  type: {
    type: String,
    enum: {
      values: ['indoor', 'outdoor'],
      message: 'Court type must be either indoor or outdoor'
    },
    required: [true, 'Court type is required']
  },
  status: {
    type: String,
    default: 'available'
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  capacity: {
    type: Number,
    min: [1, 'Capacity must be at least 1'],
    max: [100, 'Capacity cannot exceed 100'],
    default: 4
  }
}, {
  timestamps: true
});

// Indexes for performance
CourtSchema.index({ name: 1 });
CourtSchema.index({ status: 1 });
CourtSchema.index({ type: 1 });
CourtSchema.index({ isActive: 1 });

// Virtual for court display name
CourtSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.type})`;
});

// Virtual for availability status
CourtSchema.virtual('isAvailable').get(function() {
  return this.status === 'available' && this.isActive;
});

// Static method to get available courts
CourtSchema.statics.getAvailableCourts = async function() {
  return this.find({ 
    status: 'available', 
    isActive: true 
  }).sort({ name: 1 });
};

// Static method to get courts by type
CourtSchema.statics.getCourtsByType = async function(type: 'indoor' | 'outdoor') {
  return this.find({ 
    type, 
    isActive: true 
  }).sort({ name: 1 });
};

// Pre-save middleware to ensure court name is unique
CourtSchema.pre<ICourt>('save', async function(next) {
  if (this.isNew || this.isModified('name')) {
    const existingCourt = await (this.constructor as any).findOne({ 
      name: this.name,
      _id: { $ne: this._id }
    });
    
    if (existingCourt) {
      return next(new Error('Court name must be unique'));
    }
  }
  next();
});

// Ensure virtual fields are serialized
CourtSchema.set('toJSON', {
  virtuals: true
});

export default mongoose.model<ICourt>('Court', CourtSchema);