const Job = require('../models/jobModel'); // ✅ Correct and clean





exports.createTradyJob = async (req, res) => {
  const { title, description, location, jobType, deadline, email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required for applications.' });
  }

  const job = new Job({
    title,
    description,
    location,
    jobType,
    deadline,
    email,
    postedBy: 'Trady',
  });

  await job.save();
  res.status(201).json(job);
};


exports.getTradyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: 'Trady' }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    console.error('❌ Error in getTradyJobs:', err); // <--- log it here
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};
