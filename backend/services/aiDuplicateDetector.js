const router = require('express').Router();
const Complaint = require('../models/Complaint');
const Issue = require('../models/Issue');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Simple similarity function
const calculateSimilarity = (text1, text2) => {
  if (!text1 || !text2) return 0;
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  const commonWords = words1.filter(word => words2.includes(word));
  return commonWords.length / Math.max(words1.length, words2.length);
};

// Find duplicate issues
const findDuplicateIssue = async (title, description, category, ward) => {
  try {
    const existingIssues = await Issue.find({ 
      category, 
      ward,
      status: { $nin: ['Resolved', 'Verified', 'Rejected'] }
    });
    
    for (const issue of existingIssues) {
      const complaints = await Complaint.find({ _id: { $in: issue.complaintIds } });
      
      for (const complaint of complaints) {
        const titleSimilarity = calculateSimilarity(title, complaint.title);
        const descSimilarity = calculateSimilarity(description, complaint.description);
        
        if (titleSimilarity > 0.4 || descSimilarity > 0.3) {
          return {
            isDuplicate: true,
            existingIssue: {
              id: issue._id,
              title: issue.issueTitle,
              complaintCount: issue.complaintCount,
              upvotes: issue.votes?.affected || 0,
              priority: issue.priority,
              category: issue.category,
              ward: issue.ward,
              status: issue.status
            },
            similarity: Math.max(titleSimilarity, descSimilarity)
          };
        }
      }
    }
    return { isDuplicate: false };
  } catch (err) {
    console.error('Error finding duplicate:', err);
    return { isDuplicate: false };
  }
};

// ============== CHECK DUPLICATE API ==============
router.post('/check-duplicate', async (req, res) => {
  try {
    const { title, description, category, ward } = req.body;
    const duplicate = await findDuplicateIssue(title, description, category, ward);
    
    if (duplicate.isDuplicate) {
      return res.json({
        isDuplicate: true,
        existingIssue: duplicate.existingIssue,
        similarity: duplicate.similarity
      });
    }
    res.json({ isDuplicate: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== UPVOTE EXISTING ISSUE ==============
router.post('/:id/upvote', auth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    
    issue.votes.affected = (issue.votes.affected || 0) + 1;
    issue.complaintCount = (issue.complaintCount || 0) + 1;
    
    if (issue.complaintCount >= 10) issue.priority = 'High';
    else if (issue.complaintCount >= 5) issue.priority = 'Medium';
    else issue.priority = 'Low';
    
    await issue.save();
    await User.findByIdAndUpdate(req.user.id, { $inc: { points: 5 } });
    
    res.json({
      success: true,
      message: 'Thank you for upvoting!',
      complaintCount: issue.complaintCount,
      priority: issue.priority,
      upvotes: issue.votes.affected
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== CREATE COMPLAINT ==============
router.post('/', auth, async (req, res) => {
  try {
    const complaint = new Complaint({
      ...req.body,
      userId: req.user.id
    });
    await complaint.save();
    await User.findByIdAndUpdate(req.user.id, { $inc: { points: 10 } });
    res.status(201).json(complaint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== GET COMPLAINTS ==============
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'citizen') {
      query.userId = req.user.id;
    } else if (req.user.role === 'authority' && req.user.ward) {
      query['location.ward'] = req.user.ward;
    }
    const complaints = await Complaint.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== GET SINGLE COMPLAINT ==============
router.get('/:id', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('userId', 'name email');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json(complaint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== UPDATE COMPLAINT STATUS ==============
router.put('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'authority' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { status, resolutionProof } = req.body;
    const updateData = { status };
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
      updateData.resolutionProof = resolutionProof;
    }
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(complaint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== UPVOTE COMPLAINT ==============
router.post('/:id/upvote-complaint', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    const hasUpvoted = complaint.upvotes.includes(req.user.id);
    if (hasUpvoted) {
      complaint.upvotes = complaint.upvotes.filter(id => id.toString() !== req.user.id);
      complaint.upvoteCount--;
    } else {
      complaint.upvotes.push(req.user.id);
      complaint.upvoteCount++;
    }
    await complaint.save();
    res.json({ upvoteCount: complaint.upvoteCount, hasUpvoted: !hasUpvoted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== DASHBOARD STATS ==============
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'authority' && req.user.ward) {
      query['location.ward'] = req.user.ward;
    }
    const total = await Complaint.countDocuments(query);
    const resolved = await Complaint.countDocuments({ ...query, status: 'resolved' });
    const pending = await Complaint.countDocuments({ ...query, status: 'pending' });
    const inProgress = await Complaint.countDocuments({ ...query, status: 'in-progress' });
    const overdue = await Complaint.countDocuments({ 
      ...query, 
      status: { $ne: 'resolved' },
      slaDeadline: { $lt: new Date() }
    });
    res.json({ total, resolved, pending, inProgress, overdue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;