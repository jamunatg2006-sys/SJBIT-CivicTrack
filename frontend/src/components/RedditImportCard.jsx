import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, CheckCircle, MapPin, 
  FileText, ExternalLink, TrendingUp,
  Users
} from 'lucide-react';
import ImportConfirmationModal from './ImportConfirmationModal';

const RedditImportCard = ({ post, onImport }) => {
  const { user } = useAuth();
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const categories = [
    { value: 'Roads', label: '🛣️ Roads & Potholes', keywords: ['pothole', 'road', 'street', 'traffic'] },
    { value: 'Sanitation', label: '🗑️ Garbage & Sanitation', keywords: ['garbage', 'waste', 'trash', 'dump', 'sewage'] },
    { value: 'Water', label: '💧 Water Supply', keywords: ['water', 'pipe', 'leak', 'drainage', 'flood'] },
    { value: 'Electricity', label: '💡 Electricity & Lights', keywords: ['light', 'power', 'electric', 'outage'] },
    { value: 'Other', label: '📌 Other Issues', keywords: [] }
  ];

  const detectCategory = () => {
    const titleLower = post.title.toLowerCase();
    for (const cat of categories) {
      if (cat.keywords.some(keyword => titleLower.includes(keyword))) {
        return cat.value;
      }
    }
    return 'Other';
  };

  const handleImportClick = () => {
    if (!user) {
      alert('⚠️ Please login to import civic issues');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmImport = async (importData) => {
    setImporting(true);
    setShowConfirmModal(false);
    
    try {
      const storedUser = localStorage.getItem('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : user;
      
      if (!currentUser) {
        alert('⚠️ Please login first');
        setImporting(false);
        return;
      }
      
      const newComplaint = {
        id: Date.now(),
        title: importData.title,
        description: importData.description,
        category: importData.category,
        ward: importData.ward,
        location: importData.location,
        status: 'pending',
        date: new Date().toISOString(),
        upvotes: importData.sourceScore || 0,
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.name,
        source: 'reddit',
        sourceUrl: importData.sourceUrl,
        sourceAuthor: importData.sourceAuthor,
        sourceScore: importData.sourceScore,
        createdAt: new Date().toISOString()
      };
      
      const existing = localStorage.getItem('civictrack_complaints');
      let complaints = existing ? JSON.parse(existing) : [];
      complaints.unshift(newComplaint);
      localStorage.setItem('civictrack_complaints', JSON.stringify(complaints));
      
      updateIssuesAfterImport(newComplaint);
      
      setImported(true);
      if (onImport) onImport(newComplaint);
      alert('✅ Issue imported successfully!');
      
      setTimeout(() => setImported(false), 3000);
    } catch (error) {
      console.error('Import failed:', error);
      alert('❌ Failed to import. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const updateIssuesAfterImport = (newComplaint) => {
    const storedIssues = localStorage.getItem('civictrack_issues');
    let issues = storedIssues ? JSON.parse(storedIssues) : [];
    
    const departmentMap = {
      'Roads': 'Public Works',
      'Sanitation': 'Sanitation Department',
      'Water': 'Water Board',
      'Electricity': 'Electricity Board',
      'Other': 'General'
    };
    
    const existingIndex = issues.findIndex(i => 
      i.category === newComplaint.category && i.ward === newComplaint.ward
    );
    
    if (existingIndex >= 0) {
      issues[existingIndex].complaintCount++;
      if (issues[existingIndex].complaintCount > 10) issues[existingIndex].priority = 'High';
      else if (issues[existingIndex].complaintCount >= 5) issues[existingIndex].priority = 'Medium';
    } else {
      issues.push({
        id: `issue_${Date.now()}`,
        issueTitle: `${newComplaint.category} issues in Ward ${newComplaint.ward}`,
        category: newComplaint.category,
        ward: newComplaint.ward,
        priority: 'Low',
        status: 'Open',
        complaintCount: 1,
        assignedDepartment: departmentMap[newComplaint.category],
        createdAt: new Date().toISOString()
      });
    }
    localStorage.setItem('civictrack_issues', JSON.stringify(issues));
  };

  if (imported) {
    return (
      <div style={{
        background: 'rgba(16, 185, 129, 0.15)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '16px',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: '#10b981',
        marginBottom: '1rem'
      }}>
        <CheckCircle size={20} />
        <span>✅ Imported successfully!</span>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '1.2rem',
      marginBottom: '1rem'
    }}>
      {showConfirmModal && (
        <ImportConfirmationModal
          post={post}
          detectedCategory={detectCategory()}
          onConfirm={handleConfirmImport}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ background: 'rgba(255,69,0,0.15)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', color: '#ff4500' }}>
          🔴 r/india • {post.author}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>
          <span>👍 {post.score} upvotes</span>
          <span>💬 {post.num_comments} comments</span>
        </div>
      </div>
      
      <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>{post.title}</h4>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginBottom: '1rem' }}>
        {(post.content || post.selftext || 'Community discussion').substring(0, 150)}...
      </p>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ background: 'rgba(79,70,229,0.15)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', color: '#4f46e5' }}>
          📁 Detected: {detectCategory()}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}>🔗 View</a>
          <button onClick={handleImportClick} disabled={importing} style={{
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            border: 'none', padding: '0.3rem 0.8rem', borderRadius: '20px', color: 'white', fontSize: '0.7rem', cursor: 'pointer'
          }}>
            {importing ? '...' : '+ Import'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RedditImportCard;