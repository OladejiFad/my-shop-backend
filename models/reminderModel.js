const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  message: { type: String, required: true },
  remindAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  // add other fields if needed
});

module.exports = mongoose.model('Reminder', reminderSchema);
