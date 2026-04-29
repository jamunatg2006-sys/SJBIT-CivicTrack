const router = require('express').Router();
const Complaint = require('../models/Complaint');
const Issue = require('../models/Issue');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Import complaint from community source (Reddit)
router.post('/complaint', auth, async (req, res) => {
  try {
    const { 
      title, description, category, ward, 
      location, sourceUrl, sourceAuthor, sourceScore 
    } = req.body;

    // Create new complaint
    const complaint = new Complaint({
      title,
      description,
      category,
      location: { ward, address: location },
      userId: req.user.id,
      status: 'pending',
      upvoteCount: sourceScore || 0,
      source: 'community',
      sourceUrl,
      sourceAuthor
    });

    await complaint.save();

    // Update or create Issue
    let issue = await Issue.findOne({ category, ward });
    
    if (issue) {
      issue.complaintCount += 1;
      issue.complaintIds.push(complaint._id);
      
      // Update priority based on complaint count
      if (issue.complaintCount >= 10) issue.priority = 'High';
      else if (issue.complaintCount >= 5) issue.priority = 'Medium';
      else issue.priority = 'Low';
      
      await issue.save();
    } else {
      const departmentMap = {
        'Roads': 'Public Works',
        'Sanitation': 'Sanitation Department',
        'Water': 'Water Board',
        'Electricity': 'Electricity Board',
        'Other': 'General'
      };

      issue = new Issue({
        issueTitle: `${category} issues in Ward ${ward}`,
        category,
        ward,
        priority: 'Low',
        status: 'Open',
        complaintCount: 1,
        initialComplaintCount: 1,
        complaintIds: [complaint._id],
        assignedDepartment: departmentMap[category]
      });
      
      await issue.save();
    }

    // Award points to user
    await User.findByIdAndUpdate(req.user.id, { $inc: { points: 10 } });

    res.status(201).json({
      success: true,
      complaint,
      issue,
      message: 'Complaint imported successfully'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all imported complaints (for community feed)
router.get('/complaints', async (req, res) => {
  try {
    const complaints = await Complaint.find({ source: 'community' })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;