const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema({
  status: { type: String, enum: ['Reported', 'In Progress', 'Resolved', 'Pending Verification', 'Verified'], required: true },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, default: '' }
});

const voteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['fixed', 'notFixed'], required: true },
  timestamp: { type: Date, default: Date.now }
});

const issueSchema = new mongoose.Schema({
  issueTitle: { type: String, required: true },
  category: { type: String, enum: ['Roads', 'Sanitation', 'Water', 'Electricity', 'Other'], required: true },
  ward: { type: String, required: true },
  location: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    address: { type: String, default: '' }
  },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Low' },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Pending Verification', 'Verified', 'Rejected'], default: 'Open' },
  complaintCount: { type: Number, default: 1 },
  initialComplaintCount: { type: Number, default: 1 },
  complaintIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' }],
  assignedDepartment: { type: String, required: true },
  
  // Public Intelligence Fields
  locationDetails: {
    lat: { type: Number },
    lng: { type: Number },
    ward: { type: String },
    area: { type: String },
    landmark: { type: String }
  },
  
  votes: {
    affected: { type: Number, default: 0 },
    fixed: { type: Number, default: 0 },
    notFixed: { type: Number, default: 0 }
  },
  
  timeline: [timelineSchema],
  
  slaDeadline: { type: Date, default: () => new Date(+new Date() + 48*60*60*1000) },
  isOverdue: { type: Boolean, default: false },
  
  affectedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  resolutionDetails: {
    beforeImage: { type: String, default: null },
    afterImage: { type: String, default: null },
    resolutionNote: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null }
  },
  
  impactMetrics: {
    reduction: { type: Number, default: 0 },
    improvementPercentage: { type: Number, default: 0 },
    peakComplaintCount: { type: Number, default: 1 },
    resolutionTime: { type: Number, default: 0 },
    communityTrustScore: { type: Number, default: 0 }
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-add timeline when status changes
issueSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const lastTimeline = this.timeline[this.timeline.length - 1];
    if (!lastTimeline || lastTimeline.status !== this.status) {
      this.timeline.push({ status: this.status, timestamp: new Date() });
    }
  }
  
  // Check overdue
  if (this.slaDeadline && new Date() > this.slaDeadline && this.status !== 'Resolved' && this.status !== 'Verified') {
    this.isOverdue = true;
  }
  
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Issue', issueSchema);