const router = require('express').Router();
const Complaint = require('../models/Complaint');
const Issue = require('../models/Issue');
const User = require('../models/User');
const auth = require('../middleware/auth');
const {
  calculatePriority,
  extractKeywords,
  calculateSimilarity,
  getDepartment,
  updateImpactMetrics
} = require('../services/priorityEngine');

// Create complaint with duplicate detection
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, location, severity, imageUrl } = req.body;
    
    // Check for existing similar issues
    const existingIssues = await Issue.find({
      category: category,
      ward: location.ward,
      status: { $ne: 'Resolved' }
    });
    
    let matchedIssue = null;
    let highestSimilarity = 0.6; // Threshold for matching
    
    for (const issue of existingIssues) {
      const issueComplaints = await Complaint.find({ issueId: issue._id });
      for (const issueComplaint of issueComplaints) {
        const similarity = calculateSimilarity(
          { title, description, category, location },
          issueComplaint
        );
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          matchedIssue = issue;
        }
      }
    }
    
    let issueId = null;
    
    if (matchedIssue) {
      // Attach to existing issue
      issueId = matchedIssue._id;
      matchedIssue.complaintCount += 1;
      matchedIssue.updatedAt = new Date();
      
      // Update priority based on new count
      matchedIssue.priority = calculatePriority(
        matchedIssue.complaintCount,
        title,
        description
      );
      
      await matchedIssue.save();
      await updateImpactMetrics(matchedIssue);
    } else {
      // Create new issue
      const issueTitle = title;
      const keywords = extractKeywords(title, description);
      const assignedDepartment = getDepartment(category);
      const priority = calculatePriority(1, title, description);
      
      const newIssue = new Issue({
        issueTitle,
        category,
        ward: location.ward,
        priority,
        complaintCount: 1,
        initialComplaintCount: 1,
        keywords,
        assignedDepartment,
        location: {
          address: location.address,
          lat: location.lat,
          lng: location.lng
        }
      });
      
      await newIssue.save();
      issueId = newIssue._id;
    }
    
    // Create the complaint
    const complaint = new Complaint({
      title,
      description,
      category,
      location,
      userId: req.user.id,
      severity,
      imageUrl,
      issueId
    });
    
    await complaint.save();
    
    // Add complaint to issue's complaintIds array
    await Issue.findByIdAndUpdate(issueId, {
      $push: { complaintIds: complaint._id }
    });
    
    // Award points to user
    await User.findByIdAndUpdate(req.user.id, { $inc: { points: 10 } });
    
    res.status(201).json({
      complaint,
      issueId,
      isDuplicate: !!matchedIssue,
      message: matchedIssue 
        ? 'Complaint added to existing issue'
        : 'New issue created'
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all issues (aggregated complaints)
router.get('/issues', auth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'authority' && req.user.ward) {
      query.ward = req.user.ward;
    }
    
    const issues = await Issue.find(query)
      .populate('complaintIds', 'title description createdAt upvoteCount')
      .sort({ priority: -1, complaintCount: -1 });
    
    res.json(issues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single issue with all complaints
router.get('/issues/:id', auth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('complaintIds', 'title description createdAt upvoteCount userId')
      .populate('assignedTo', 'name email');
    
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update issue status
router.put('/issues/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'authority' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { status, assignedTo } = req.body;
    const updateData = { status };
    
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (status === 'Resolved') updateData.resolvedAt = new Date();
    
    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    // Update all associated complaints
    await Complaint.updateMany(
      { issueId: req.params.id },
      { status: status === 'Resolved' ? 'resolved' : 'in-progress' }
    );
    
    await updateImpactMetrics(issue);
    
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get impact metrics dashboard
router.get('/impact/metrics', auth, async (req, res) => {
  try {
    const totalIssues = await Issue.countDocuments();
    const resolvedIssues = await Issue.countDocuments({ status: 'Resolved' });
    const highPriorityIssues = await Issue.countDocuments({ priority: 'High' });
    
    const issues = await Issue.find();
    const totalComplaints = issues.reduce((acc, i) => acc + i.complaintCount, 0);
    const totalReduction = issues.reduce((acc, i) => acc + (i.impactMetrics?.reduction || 0), 0);
    const avgImprovement = issues.length > 0 
      ? (totalReduction / totalComplaints) * 100 
      : 0;
    
    // Category wise impact
    const categoryImpact = {};
    const categories = ['Roads', 'Sanitation', 'Water', 'Electricity', 'Other'];
    
    categories.forEach(cat => {
      const catIssues = issues.filter(i => i.category === cat);
      const catComplaints = catIssues.reduce((acc, i) => acc + i.complaintCount, 0);
      const catReduction = catIssues.reduce((acc, i) => acc + (i.impactMetrics?.reduction || 0), 0);
      categoryImpact[cat] = {
        totalIssues: catIssues.length,
        totalComplaints: catComplaints,
        reduction: catReduction,
        improvement: catComplaints > 0 ? (catReduction / catComplaints) * 100 : 0
      };
    });
    
    // Recent activity
    const recentIssues = await Issue.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('complaintIds', 'title');
    
    res.json({
      summary: {
        totalIssues,
        resolvedIssues,
        highPriorityIssues,
        totalComplaints,
        totalReduction,
        avgImprovement: avgImprovement.toFixed(1),
        resolutionRate: totalIssues > 0 ? ((resolvedIssues / totalIssues) * 100).toFixed(1) : 0
      },
      categoryImpact,
      recentIssues
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;