import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VerificationStatus from '../components/VerificationStatus';
import { 
  LayoutDashboard, CheckCircle, Clock, AlertTriangle, 
  Plus, ThumbsUp, MapPin, Calendar, TrendingUp,
  FileText, Award, ArrowRight, Activity, Trash2,
  MessageCircle
} from 'lucide-react';
import './Dashboard.css';
const Dashboard = () => {
  const { user } = useAuth();
  
  const [complaints, setComplaints] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    pending: 0,
    inProgress: 0,
    points: 0
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = () => {
    try {
      const storedComplaints = localStorage.getItem('civictrack_complaints');
      let allComplaints = storedComplaints ? JSON.parse(storedComplaints) : [];
      
      const userComplaints = allComplaints.filter(c => 
        c.userEmail === user?.email || c.userId === user?.id
      );
      
      setComplaints(userComplaints);
      
      const total = userComplaints.length;
      const resolved = userComplaints.filter(c => c.status === 'resolved').length;
      const pending = userComplaints.filter(c => c.status === 'pending').length;
      const inProgress = userComplaints.filter(c => c.status === 'in-progress').length;
      const points = total * 10;
      
      setStats({ total, resolved, pending, inProgress, points });
      
      const storedIssues = localStorage.getItem('civictrack_issues');
      if (storedIssues) {
        setIssues(JSON.parse(storedIssues));
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleDeleteComplaint = (complaintId) => {
    if (window.confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) {
      const storedComplaints = localStorage.getItem('civictrack_complaints');
      let allComplaints = storedComplaints ? JSON.parse(storedComplaints) : [];
      
      const complaintToDelete = allComplaints.find(c => c.id === complaintId);
      if (complaintToDelete && (complaintToDelete.userEmail === user?.email || complaintToDelete.userId === user?.id)) {
        const updatedComplaints = allComplaints.filter(c => c.id !== complaintId);
        localStorage.setItem('civictrack_complaints', JSON.stringify(updatedComplaints));
        
        const storedIssues = localStorage.getItem('civictrack_issues');
        if (storedIssues) {
          let allIssues = JSON.parse(storedIssues);
          const updatedIssues = allIssues.map(issue => {
            const updatedComplaintCount = updatedComplaints.filter(c => 
              c.category === issue.category && c.ward === issue.ward
            ).length;
            return { ...issue, complaintCount: updatedComplaintCount };
          });
          localStorage.setItem('civictrack_issues', JSON.stringify(updatedIssues));
        }
        
        loadData();
        alert('Complaint deleted successfully');
      } else {
        alert('You can only delete your own complaints');
      }
    }
  };

  if (user?.role === 'admin') {
    return <Navigate to="/admin" />;
  }

  const statsCards = [
    { label: 'My Reports', value: stats.total, icon: <FileText size={24} />, color: '#4f46e5', trend: 'Total complaints' },
    { label: 'Resolved', value: stats.resolved, icon: <CheckCircle size={24} />, color: '#10b981', trend: 'Successfully fixed' },
    { label: 'In Progress', value: stats.inProgress, icon: <Activity size={24} />, color: '#f59e0b', trend: 'Being addressed' },
    { label: 'Pending', value: stats.pending, icon: <Clock size={24} />, color: '#ef4444', trend: 'Awaiting action' },
  ];

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': 
        return <span className="status-badge pending"><Clock size={12} /> PENDING</span>;
      case 'in-progress': 
        return <span className="status-badge progress"><Activity size={12} /> IN PROGRESS</span>;
      case 'resolved': 
        return <span className="status-badge resolved"><CheckCircle size={12} /> RESOLVED</span>;
      default: 
        return <span className="status-badge pending"><Clock size={12} /> PENDING</span>;
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-bg">
          <div className="gradient-orb"></div>
          <div className="gradient-orb2"></div>
          <div className="gradient-orb3"></div>
          <div className="grid-overlay"></div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-bg">
        <div className="gradient-orb"></div>
        <div className="gradient-orb2"></div>
        <div className="gradient-orb3"></div>
        <div className="grid-overlay"></div>
      </div>

      <div className="dashboard-container">
        {/* Welcome Section */}
        <motion.div 
          className="welcome-card glass"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="welcome-content">
            <div className="welcome-text">
              <h1>Welcome back, {user?.name || 'Citizen'}! 👋</h1>
              <p>Track your reports and city impact</p>
            </div>
            <div className="points-badge">
              <Award size={20} />
              <div>
                <div className="points-value">{stats.points}</div>
                <div className="points-label">Impact Points</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="stats-grid">
          {statsCards.map((stat, index) => (
            <motion.div 
              key={index}
              className="stat-card glass"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -3 }}
            >
              <div className="stat-icon" style={{ color: stat.color }}>{stat.icon}</div>
              <div className="stat-number">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-trend">{stat.trend}</div>
            </motion.div>
          ))}
        </div>

        {/* City Issues Overview */}
        {issues.length > 0 && (
          <motion.div 
            className="issues-overview glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="section-header">
              <TrendingUp size={20} />
              <h3>City Issues Overview</h3>
            </div>
            <div className="issues-mini-grid">
              {issues.slice(0, 4).map((issue, idx) => (
                <div key={idx} className="issue-mini-card">
                  <div className="issue-mini-priority" style={{ 
                    background: issue.priority === 'High' ? '#ef4444' : 
                               issue.priority === 'Medium' ? '#f59e0b' : '#10b981'
                  }}>
                    {issue.priority}
                  </div>
                  <div className="issue-mini-title">{issue.issueTitle}</div>
                  <div className="issue-mini-stats">
                    <span><FileText size={12} /> {issue.complaintCount} reports</span>
                    <span><MapPin size={12} /> Ward {issue.ward}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
{/* Recent Reports Section */}
<motion.div 
  className="reports-card glass"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.3 }}
>
  <div className="card-header">
    <div className="header-title">
      <LayoutDashboard size={22} className="header-icon" />
      <h2>My Recent Reports</h2>
    </div>
    <Link to="/report">
      <button className="new-report-btn">
        <Plus size={16} />
        <span>New Report</span>
      </button>
    </Link>
  </div>
  
  {complaints.length === 0 ? (
    <div className="empty-state">
      <div className="empty-icon">📭</div>
      <h3>No reports yet</h3>
      <p>Be the voice that fixes your city. Report your first issue now!</p>
      <Link to="/report">
        <button className="empty-action-btn">
          Create Your First Report
          <ArrowRight size={16} />
        </button>
      </Link>
    </div>
  ) : (
    <div className="reports-list">
      {complaints.slice(0, 5).map((complaint, index) => (
        <motion.div
          key={complaint.id}
          className="report-item"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.01 }}
        >
          {/* Category Color Bar */}
          <div className={`report-category-bar ${complaint.category.toLowerCase()}`}></div>
          
          <div className="report-header">
            <div className="report-info">
              <div className="report-title-row">
                <h3 className="report-title">{complaint.title}</h3>
                {getStatusBadge(complaint.status)}
              </div>
              <div className="report-meta">
                <span className={`report-category ${complaint.category.toLowerCase()}`}>
                  {complaint.category === 'Roads' && '🛣️'}
                  {complaint.category === 'Sanitation' && '🗑️'}
                  {complaint.category === 'Water' && '💧'}
                  {complaint.category === 'Electricity' && '💡'}
                  {complaint.category === 'Other' && '📌'}
                  {' '}{complaint.category}
                </span>
                <span className="report-location">
                  <MapPin size={12} /> Ward {complaint.ward}
                </span>
                <span className="report-date">
                  <Calendar size={12} /> {new Date(complaint.date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <p className="report-description">{complaint.description?.substring(0, 120)}...</p>
          
          {/* Community Verification Component */}
          <VerificationStatus issue={{ 
            id: complaint.issueId || complaint.id,
            verifiedCount: complaint.verifiedCount || 8,
            notFixedCount: complaint.notFixedCount || 3,
            verificationStatus: 'pending'
          }} />
          
          <div className="report-footer">
            <div className="report-stats">
              <span className="upvote-stat">
                <ThumbsUp size={14} /> {complaint.upvotes || 0} upvotes
              </span>
              <span className="comments-stat">
                <MessageCircle size={14} /> {complaint.comments || 0} discussions
              </span>
            </div>
            <button 
              className="delete-report-btn"
              onClick={() => handleDeleteComplaint(complaint.id)}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
          
          {/* View & Verify Button */}
          <Link to={`/verify/${complaint.id}`} className="verify-link">
            <button className="verify-issue-btn">
              <span className="verify-icon">🔍</span>
              <span className="verify-text">View & Verify This Issue</span>
              <span className="verify-arrow">→</span>
            </button>
          </Link>
        </motion.div>
      ))}
    </div>
  )}
</motion.div>
      </div>
    </div>
  );
};

export default Dashboard;