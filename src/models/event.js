const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  eventName: { type: String, required: true },
  interviewDate: { type: Date, required: true },
  candidate: {
    domain: { type: Array, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  interviewer: {
    interviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  scheduledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  meetingLink: { type: String },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'approved', 'rejected'],
    default: 'pending',
  },
  notes: { type: String },
  rescheduleHistory: [
    {
      previousDate: Date,
      rescheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: String,
      dateRescheduled: { type: Date, default: Date.now },
    },
  ],
  feedback: {
    givenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: Number,
    comments: String,
    submittedAt: Date,
  },
  reminderSent: {
    type: Boolean,
    default: false,
  },
  organization: {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true },
  },
}, {
  timestamps: true,
  versionKey: false,
});

module.exports = mongoose.model('Event', EventSchema);