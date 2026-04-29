const router = require('express').Router();
const Issue = require('../models/Issue');
const Complaint = require('../models/Complaint');
const auth = require('../middleware/auth');

// Get verification status for an issue (public - no auth required)
router.get('/:issueId/status', async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.issueId);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    
    const verificationStats = issue.calculateVerificationPercentage();
    
    res.json({
      verificationStatus: issue.verificationStatus,
      verifiedCount: issue.verifiedCount,
      notFixedCount: issue.notFixedCount,
      totalVotes: verificationStats.totalVotes,
      fixedPercentage: verificationStats.fixedPercentage,
      notFixedPercentage: verificationStats.notFixedPercentage,
      communityTrustScore: issue.impactMetrics?.communityTrustScore || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit verification vote
router.post('/:issueId/verify', auth, async (req, res) => {
  try {
    const { vote } = req.body;
    const issueId = req.params.issueId;
    const userId = req.user.id;
    
    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    
    // Check if issue is in verification period
    if (issue.status !== 'Pending Verification') {
      return res.status(400).json({ message: 'Issue is not pending verification' });
    }
    
    // Check if user has already voted
    const hasVoted = issue.verificationVotes.some(v => v.userId.toString() === userId);
    if (hasVoted) {
      return res.status(400).json({ message: 'You have already voted on this issue' });
    }
    
    // Check if user is eligible to vote (same ward or has interacted)
    const userComplaint = await Complaint.findOne({ 
      userId: userId, 
      'location.ward': issue.ward 
    });
    
    if (!userComplaint && req.user.ward !== issue.ward) {
      return res.status(403).json({ message: 'You are not eligible to vote on this issue' });
    }
    
    // Add vote
    issue.verificationVotes.push({
      userId: userId,
      vote: vote,
      userName: req.user.name,
      userWard: req.user.ward || issue.ward
    });
    
    if (vote === 'fixed') {
      issue.verifiedCount++;
    } else {
      issue.notFixedCount++;
    }
    
    // Update verification status
    const newStatus = issue.updateVerificationStatus();
    
    // Update community trust score
    const totalVotes = issue.verifiedCount + issue.notFixedCount;
    issue.impactMetrics.communityTrustScore = totalVotes > 0 
      ? (issue.verifiedCount / totalVotes) * 100 
      : 0;
    
    await issue.save();
    
    res.json({
      success: true,
      verificationStatus: newStatus,
      verifiedCount: issue.verifiedCount,
      notFixedCount: issue.notFixedCount,
      fixedPercentage: (issue.verifiedCount / totalVotes) * 100,
      message: 'Vote recorded successfully'
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin upload after image (resolution proof)
router.post('/:issueId/proof', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'authority') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { afterImage, resolutionNote } = req.body;
    const issue = await Issue.findById(req.params.issueId);
    
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    
    issue.afterImage = afterImage;
    issue.resolutionNote = resolutionNote;
    issue.status = 'Pending Verification';
    issue.verificationStatus = 'pending';
    issue.resolvedAt = new Date();
    
    await issue.save();
    
    res.json({ success: true, message: 'Resolution proof uploaded. Issue pending verification.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;