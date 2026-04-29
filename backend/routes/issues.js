const router = require('express').Router();
const Issue = require('../models/Issue');
const Complaint = require('../models/Complaint');
const auth = require('../middleware/auth');
const { updateImpactMetrics } = require('../services/priorityEngine');

// Get all issues (aggregated complaints)
router.get('/', auth, async (req, res) => {
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
router.get('/:id', auth, async (req, res) => {
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
router.put('/:id/status', auth, async (req, res) => {
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
router.get('/metrics/dashboard', auth, async (req, res) => {
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