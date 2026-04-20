import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please provide a project title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['personal', 'office', 'freelance'],
    default: 'personal'
  },
  amount: {
    type: Number,
    default: 0
  },
  paymentReceived: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'on-hold'],
    default: 'active'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  githubUrl: {
    type: String,
    trim: true
  },
  repos: [{
    label: { type: String, trim: true },
    url: { type: String, trim: true }
  }],
  backendUrl: {
    type: String,
    trim: true
  },
  frontendUrl: {
    type: String,
    trim: true
  },
  liveLinks: [{
    label: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  dailyUpdates: [{
    date: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      required: true
    },
    note: {
      type: String,
      trim: true
    }
  }],
  credentials: [{
    label: { type: String, trim: true },
    username: { type: String, trim: true },
    password: { type: String, trim: true }
  }],
  deletedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
ProjectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Project', ProjectSchema);