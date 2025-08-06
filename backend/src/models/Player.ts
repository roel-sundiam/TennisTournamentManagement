import mongoose, { Document, Schema } from 'mongoose';

export interface IPlayer extends Document {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  ranking?: number;
  isActive: boolean;
  notes?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  club: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSchema: Schema = new Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\d\s\-\+\(\)]+$/, 'Please provide a valid phone number']
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(value: Date) {
        if (!value) return true; // Optional field
        const today = new Date();
        const age = today.getFullYear() - value.getFullYear();
        return age >= 5 && age <= 100; // Reasonable age range
      },
      message: 'Age must be between 5 and 100 years'
    }
  },
  gender: {
    type: String,
    enum: {
      values: ['male', 'female', 'other'],
      message: 'Gender must be male, female, or other'
    }
  },
  skillLevel: {
    type: String,
    enum: {
      values: ['beginner', 'intermediate', 'advanced', 'professional'],
      message: 'Skill level must be beginner, intermediate, advanced, or professional'
    },
    required: [true, 'Skill level is required']
  },
  ranking: {
    type: Number,
    min: [1, 'Ranking must be at least 1'],
    max: [10000, 'Ranking cannot exceed 10000']
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
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Emergency contact name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\d\s\-\+\(\)]+$/, 'Please provide a valid emergency contact phone number']
    },
    relationship: {
      type: String,
      trim: true,
      maxlength: [50, 'Relationship cannot exceed 50 characters']
    }
  },
  club: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: [true, 'Club is required for player']
  }
}, {
  timestamps: true
});

// Indexes for performance
PlayerSchema.index({ skillLevel: 1 });
PlayerSchema.index({ isActive: 1 });
PlayerSchema.index({ club: 1 });
PlayerSchema.index({ club: 1, isActive: 1 });
PlayerSchema.index({ club: 1, skillLevel: 1 });
PlayerSchema.index({ email: 1 }, { unique: true, sparse: true });

// Virtual for full name
PlayerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age calculation
PlayerSchema.virtual('age').get(function(this: IPlayer) {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth as Date);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});


// Ensure virtual fields are serialized
PlayerSchema.set('toJSON', {
  virtuals: true
});

export default mongoose.model<IPlayer>('Player', PlayerSchema);