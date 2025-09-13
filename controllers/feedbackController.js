const Feedback = require('../models/feedbackModel');

const submitFeedback = async (req, res) => {
  try {
    const { userId, orderId, rating, comment } = req.body;
    if (!userId || !rating) {
      return res.status(400).json({ message: 'UserId and rating are required' });
    }
    const feedback = new Feedback({ userId, orderId, rating, comment });
    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted', feedback });
  } catch (error) {
    res.status(500).json({ message: 'Server error submitting feedback' });
  }
};

const getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().populate('userId', 'name email');
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching feedbacks' });
  }
};

module.exports = { submitFeedback, getAllFeedback };
