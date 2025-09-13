// models/Job.js
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: String,
  description: String,
  location: String,
  jobType: String,
  // e.g., 'part-time', 'remote'
  deadline: Date,
  email: { type: String, required: true },


  postedBy: {
    type: String,
    enum: ['Trady'], // only Trady posts jobs
    default: 'Trady',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Job', jobSchema);
