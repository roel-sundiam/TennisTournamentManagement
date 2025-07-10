import mongoose, { Document, Schema } from 'mongoose';

export interface IPlayerRegistration extends Document {
  player: mongoose.Types.ObjectId;
  tournament: mongoose.Types.ObjectId;
  seed?: number;
  registrationDate: Date;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerRegistrationSchema: Schema = new Schema({
  player: {
    type: Schema.Types.ObjectId,
    ref: 'Player',
    required: [true, 'Player reference is required']
  },
  tournament: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: [true, 'Tournament reference is required']
  },
  seed: {
    type: Number,
    min: [1, 'Seed must be at least 1']
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes for performance
PlayerRegistrationSchema.index({ tournament: 1 });
PlayerRegistrationSchema.index({ player: 1 });
PlayerRegistrationSchema.index({ tournament: 1, player: 1 });
PlayerRegistrationSchema.index({ tournament: 1, seed: 1 });
PlayerRegistrationSchema.index({ tournament: 1, isActive: 1 });

// Compound unique index to prevent duplicate registrations
PlayerRegistrationSchema.index({ tournament: 1, player: 1 }, { 
  unique: true,
  partialFilterExpression: { isActive: true }
});

// Compound unique index to ensure unique seeds per tournament
PlayerRegistrationSchema.index({ tournament: 1, seed: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { seed: { $exists: true, $ne: null }, isActive: true }
});

// Middleware to ensure unique seeds within tournament
PlayerRegistrationSchema.pre<IPlayerRegistration>('save', async function (next) {
  if (this.isModified('seed') && this.seed) {
    const existingRegistration = await mongoose.model('PlayerRegistration').findOne({
      tournament: this.tournament,
      seed: this.seed,
      _id: { $ne: this._id },
      isActive: true
    });

    if (existingRegistration) {
      return next(new Error(`Seed ${this.seed} is already assigned to another player in this tournament`));
    }
  }
  next();
});

export default mongoose.model<IPlayerRegistration>('PlayerRegistration', PlayerRegistrationSchema);