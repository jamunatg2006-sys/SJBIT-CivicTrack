import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler } from 'chart.js';
import { Pie, Bar, Line, Doughnut } from 'react-chartjs-2';
import { 
  MapPin, TrendingUp, CheckCircle, Clock, AlertTriangle, Flame, 
  RefreshCw, Search, X, ThumbsUp, ThumbsDown, Eye, 
  Calendar, User, Building, Download, Upload,
  Star, Zap, Shield, Trophy
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './WardDashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler);

const WardDashboard = () => {
  const [selectedWard, setSelectedWard] = useState('all');
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [notifications, setNotifications] = useState([]);

  const wards = ['all', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const statuses = ['all', 'Pending', 'In Progress', 'Resolved', 'Verified'];
  const priorities = ['all', 'High', 'Medium', 'Low'];

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [selectedWard, filterStatus, filterPriority, searchTerm]);

  const loadData = () => {
    setLoading(true);
    try {
      const storedIssues = localStorage.getItem('civictrack_issues');
      let allIssues = storedIssues ? JSON.parse(storedIssues) : generateMockIssues();
      
      let filteredIssues = [...allIssues];
      if (selectedWard !== 'all') {
        filteredIssues = filteredIssues.filter(i => i.ward === selectedWard);
      }
      if (filterStatus !== 'all') {
        filteredIssues = filteredIssues.filter(i => i.status === filterStatus);
      }
      if (filterPriority !== 'all') {
        filteredIssues = filteredIssues.filter(i => i.priority === filterPriority);
      }
      if (searchTerm) {
        filteredIssues = filteredIssues.filter(i => 
          i.issueTitle?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setIssues(filteredIssues);
      calculateStats(filteredIssues);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (issuesList) => {
    const total = issuesList.length;
    const resolved = issuesList.filter(i => i.status === 'Resolved' || i.status === 'Verified').length;
    const pending = issuesList.filter(i => i.status === 'Pending').length;
    const inProgress = issuesList.filter(i => i.status === 'In Progress').length;
    const highPriority = issuesList.filter(i => i.priority === 'High').length;
    const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : 0;
    setStats({ total, resolved, pending, inProgress, highPriority, resolutionRate });
  };

  const generateMockIssues = () => {
    const mockIssues = [];
    const categories = ['Roads', 'Sanitation', 'Water', 'Electricity', 'Other'];
    const wardsList = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const statusesList = ['Pending', 'In Progress', 'Resolved', 'Verified'];
    
    for (let i = 1; i <= 25; i++) {
      const complaintCount = Math.floor(Math.random() * 30) + 3;
      let priority = 'Low';
      if (complaintCount > 15) priority = 'High';
      else if (complaintCount > 8) priority = 'Medium';
      
      mockIssues.push({
        id: i,
        issueTitle: `${categories[i % categories.length]} Issue in Ward ${wardsList[i % wardsList.length]}`,
        category: categories[i % categories.length],
        ward: wardsList[i % wardsList.length],
        priority: priority,
        status: statusesList[i % 4],
        complaintCount: complaintCount,
        description: `This issue has been affecting ${complaintCount} residents in the area.`,
        location: `Area ${i}, Main Road`,
        createdAt: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        upvotes: { yes: Math.floor(Math.random() * 30) + 5, no: Math.floor(Math.random() * 10) + 1 },
        images: [],
        timeline: [
          { status: 'Complaint Raised', date: new Date(Date.now() - 30 * 86400000).toISOString() },
          { status: 'Assigned', date: new Date(Date.now() - 25 * 86400000).toISOString() },
          { status: 'Work Started', date: new Date(Date.now() - 20 * 86400000).toISOString() }
        ]
      });
    }
    localStorage.setItem('civictrack_issues', JSON.stringify(mockIssues));
    return mockIssues;
  };

  const addNotification = (message, type) => {
    const id = Date.now();
    setNotifications(prev => [{ id, message, type }, ...prev].slice(0, 5));
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  const handleVote = (issueId, vote) => {
    setIssues(prevIssues => 
      prevIssues.map(issue => {
        if (issue.id === issueId) {
          const currentUpvotes = issue.upvotes || { yes: 0, no: 0 };
          return {
            ...issue,
            upvotes: {
              yes: vote === 'yes' ? (currentUpvotes.yes || 0) + 1 : (currentUpvotes.yes || 0),
              no: vote === 'no' ? (currentUpvotes.no || 0) + 1 : (currentUpvotes.no || 0)
            }
          };
        }
        return issue;
      })
    );
    
    const storedIssues = localStorage.getItem('civictrack_issues');
    if (storedIssues) {
      let allIssues = JSON.parse(storedIssues);
      allIssues = allIssues.map(issue => {
        if (issue.id === issueId) {
          const currentUpvotes = issue.upvotes || { yes: 0, no: 0 };
          return {
            ...issue,
            upvotes: {
              yes: vote === 'yes' ? (currentUpvotes.yes || 0) + 1 : (currentUpvotes.yes || 0),
              no: vote === 'no' ? (currentUpvotes.no || 0) + 1 : (currentUpvotes.no || 0)
            }
          };
        }
        return issue;
      });
      localStorage.setItem('civictrack_issues', JSON.stringify(allIssues));
    }
    
    const message = vote === 'yes' 
      ? '✅ Thank you! You confirmed this issue is FIXED!' 
      : '❌ Thank you! You reported this issue is NOT FIXED yet.';
    addNotification(message, 'success');
    setShowDetailModal(false);
    setTimeout(() => loadData(), 500);
  };

  const handleStatusChange = (issueId, newStatus) => {
    setIssues(prevIssues => 
      prevIssues.map(issue => {
        if (issue.id === issueId) {
          const newTimeline = [...(issue.timeline || []), { status: newStatus, date: new Date().toISOString() }];
          return { ...issue, status: newStatus, timeline: newTimeline };
        }
        return issue;
      })
    );
    
    const storedIssues = localStorage.getItem('civictrack_issues');
    if (storedIssues) {
      let allIssues = JSON.parse(storedIssues);
      allIssues = allIssues.map(issue => {
        if (issue.id === issueId) {
          const newTimeline = [...(issue.timeline || []), { status: newStatus, date: new Date().toISOString() }];
          return { ...issue, status: newStatus, timeline: newTimeline };
        }
        return issue;
      });
      localStorage.setItem('civictrack_issues', JSON.stringify(allIssues));
    }
    addNotification(`Status updated to ${newStatus}`, 'info');
    setShowDetailModal(false);
    setTimeout(() => loadData(), 500);
  };

  const handleImageUpload = (issueId, imageType, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setIssues(prevIssues => 
        prevIssues.map(issue => {
          if (issue.id === issueId) {
            const newImages = [...(issue.images || []), { type: imageType, url: reader.result, date: new Date().toISOString() }];
            return { ...issue, images: newImages };
          }
          return issue;
        })
      );
      
      const storedIssues = localStorage.getItem('civictrack_issues');
      if (storedIssues) {
        let allIssues = JSON.parse(storedIssues);
        allIssues = allIssues.map(issue => {
          if (issue.id === issueId) {
            const newImages = [...(issue.images || []), { type: imageType, url: reader.result, date: new Date().toISOString() }];
            return { ...issue, images: newImages };
          }
          return issue;
        });
        localStorage.setItem('civictrack_issues', JSON.stringify(allIssues));
      }
      addNotification(`${imageType} image uploaded successfully`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      ward: selectedWard,
      summary: stats,
      issues: issues.map(i => ({
        title: i.issueTitle,
        category: i.category,
        priority: i.priority,
        status: i.status,
        complaintCount: i.complaintCount,
        upvotes: i.upvotes
      }))
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ward_report_${selectedWard}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    addNotification('Report exported successfully', 'success');
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Resolved': return <CheckCircle size={14} style={{ color: '#10b981' }} />;
      case 'Verified': return <Star size={14} style={{ color: '#10b981' }} />;
      case 'In Progress': return <Clock size={14} style={{ color: '#3b82f6' }} />;
      default: return <AlertTriangle size={14} style={{ color: '#ef4444' }} />;
    }
  };

  // Chart Data
  const statusChartData = stats ? {
    labels: ['Pending', 'In Progress', 'Resolved'],
    datasets: [{ data: [stats.pending, stats.inProgress, stats.resolved], backgroundColor: ['#ef4444', '#3b82f6', '#10b981'], borderWidth: 0 }]
  } : null;

  const priorityChartData = {
    labels: ['High', 'Medium', 'Low'],
    datasets: [{ label: 'Issues', data: [issues.filter(i => i.priority === 'High').length, issues.filter(i => i.priority === 'Medium').length, issues.filter(i => i.priority === 'Low').length], backgroundColor: ['#ef4444', '#f59e0b', '#10b981'], borderRadius: 8 }]
  };

  const monthlyTrendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{ label: 'Complaints', data: [12, 19, 15, 22, 28, 25], borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.1)', fill: true, tension: 0.4 }]
  };

  const resolutionData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      { label: 'Raised', data: [12, 19, 15, 22, 28, 25], borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true },
      { label: 'Resolved', data: [8, 14, 12, 18, 22, 23], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true }
    ]
  };

  // Generate heatmap points with proper coordinates
  const heatmapPoints = issues.map(issue => ({
    lat: 12.9716 + (Math.random() - 0.5) * 0.15,
    lng: 77.5946 + (Math.random() - 0.5) * 0.15,
    complaintCount: issue.complaintCount,
    title: issue.issueTitle,
    priority: issue.priority,
    ward: issue.ward
  }));

  // Detail Modal Component
  const DetailModal = ({ issue, onClose }) => {
    const upvotes = issue.upvotes || { yes: 0, no: 0 };
    const totalVotes = (upvotes.yes || 0) + (upvotes.no || 0);
    const satisfaction = totalVotes > 0 ? ((upvotes.yes / totalVotes) * 100).toFixed(0) : 0;

    return (
      <div className="detail-modal-overlay" onClick={onClose}>
        <div className="detail-modal glass" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>✕</button>
          
          <div className="modal-header">
            <h3>{issue.issueTitle}</h3>
            <div className="modal-priority" style={{ background: getPriorityColor(issue.priority) }}>{issue.priority}</div>
          </div>
          
          <div className="modal-details">
            <div className="detail-row"><MapPin size={16} /> Ward {issue.ward}</div>
            <div className="detail-row"><Calendar size={16} /> {new Date(issue.createdAt).toLocaleDateString()}</div>
            <div className="detail-row"><User size={16} /> Assigned: {issue.assignedTo || 'Not Assigned'}</div>
            <div className="detail-row"><Building size={16} /> {issue.category}</div>
          </div>
          
          <div className="modal-description">
            <h4>Description</h4>
            <p>{issue.description}</p>
          </div>
          
          <div className="modal-timeline">
            <h4>Progress Timeline</h4>
            <div className="timeline-bar">
              {issue.timeline?.map((item, idx) => (
                <div key={idx} className="timeline-step">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <strong>{item.status}</strong>
                    <small>{new Date(item.date).toLocaleDateString()}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="modal-voting">
            <h4>🗳️ Public Verification</h4>
            <div className="voting-stats">
              <div className="vote-yes">
                <ThumbsUp size={20} style={{ color: '#10b981' }} />
                <span className="vote-count">{upvotes.yes || 0}</span>
                <span>Verified Resolved</span>
              </div>
              <div className="vote-no">
                <ThumbsDown size={20} style={{ color: '#ef4444' }} />
                <span className="vote-count">{upvotes.no || 0}</span>
                <span>Reported Not Fixed</span>
              </div>
            </div>
            
            <div className="satisfaction-bar-container">
              <div className="satisfaction-label">
                <span>Community Satisfaction</span>
                <span className="satisfaction-percent">{satisfaction}%</span>
              </div>
              <div className="satisfaction-bar">
                <div className="satisfaction-fill" style={{ width: `${satisfaction}%`, background: satisfaction >= 60 ? '#10b981' : satisfaction >= 30 ? '#f59e0b' : '#ef4444' }}></div>
              </div>
              <div className="satisfaction-status">
                {satisfaction >= 60 ? '✅ Verified by Community' : satisfaction >= 30 ? '🔄 Awaiting More Votes' : '⚠️ Low Community Trust'}
              </div>
            </div>
            
            {issue.status === 'Resolved' ? (
              <div className="vote-buttons">
                <button className="vote-yes-btn" onClick={() => { handleVote(issue.id, 'yes'); onClose(); }}>
                  <ThumbsUp size={16} /> Yes, Issue is Fixed
                </button>
                <button className="vote-no-btn" onClick={() => { handleVote(issue.id, 'no'); onClose(); }}>
                  <ThumbsDown size={16} /> No, Still Not Fixed
                </button>
              </div>
            ) : (
              <div className="vote-waiting">
                <Clock size={14} />
                <span>Verification opens when issue is marked Resolved</span>
              </div>
            )}
          </div>
          
          {issue.images?.length > 0 && (
            <div className="modal-images">
              <h4>Resolution Images</h4>
              <div className="image-gallery">
                {issue.images.map((img, idx) => (
                  <div key={idx} className="gallery-image">
                    <img src={img.url} alt={img.type} />
                    <span>{img.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="modal-actions">
            <select onChange={(e) => handleStatusChange(issue.id, e.target.value)} value={issue.status} className="status-select">
              <option>Pending</option><option>In Progress</option><option>Resolved</option><option>Verified</option>
            </select>
            <label className="upload-label">
              <Upload size={16} /> Upload
              <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && handleImageUpload(issue.id, 'Progress', e.target.files[0])} style={{ display: 'none' }} />
            </label>
            <button className="export-btn" onClick={exportReport}><Download size={16} /> Export</button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="ward-dashboard">
        <div className="dashboard-bg"><div className="gradient-orb"></div><div className="gradient-orb2"></div><div className="grid-overlay"></div></div>
        <div className="loading-container"><div className="loading-spinner"></div><p>Loading dashboard...</p></div>
      </div>
    );
  }

  return (
    <div className="ward-dashboard">
      <div className="dashboard-bg"><div className="gradient-orb"></div><div className="gradient-orb2"></div><div className="grid-overlay"></div></div>

      {/* Notifications */}
      <div className="notification-container">
        {notifications.map(n => (
          <div key={n.id} className={`notification ${n.type}`}>
            {n.message}
          </div>
        ))}
      </div>

      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header glass">
          <div className="header-left"><MapPin size={28} className="header-icon" /><div><h1>Ward Intelligence Dashboard</h1><p>Real-time civic issue tracking • Community verified</p></div></div>
          <div className="header-right">
            <select value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)} className="ward-select">{wards.map(w => <option key={w} value={w}>{w === 'all' ? '📍 All Wards' : `📍 Ward ${w}`}</option>)}</select>
            <button className="refresh-btn" onClick={loadData}><RefreshCw size={16} /> Refresh</button>
            <button className="export-btn" onClick={exportReport}><Download size={16} /> Export</button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card glass"><div className="stat-icon"><AlertTriangle size={24} /></div><div className="stat-number animated">{stats?.total || 0}</div><div className="stat-label">Total Complaints</div></div>
          <div className="stat-card glass"><div className="stat-icon"><CheckCircle size={24} style={{ color: '#10b981' }} /></div><div className="stat-number animated">{stats?.resolved || 0}</div><div className="stat-label">Resolved</div></div>
          <div className="stat-card glass"><div className="stat-icon"><Clock size={24} style={{ color: '#f59e0b' }} /></div><div className="stat-number animated">{stats?.pending || 0}</div><div className="stat-label">Pending</div></div>
          <div className="stat-card glass"><div className="stat-icon"><Zap size={24} style={{ color: '#3b82f6' }} /></div><div className="stat-number animated">{stats?.inProgress || 0}</div><div className="stat-label">In Progress</div></div>
          <div className="stat-card glass"><div className="stat-icon"><Flame size={24} style={{ color: '#ef4444' }} /></div><div className="stat-number animated">{stats?.highPriority || 0}</div><div className="stat-label">High Priority</div></div>
          <div className="stat-card glass"><div className="stat-icon"><TrendingUp size={24} style={{ color: '#8b5cf6' }} /></div><div className="stat-number animated">{stats?.resolutionRate || 0}%</div><div className="stat-label">Resolution Rate</div></div>
        </div>

        {/* Live Impact Scorecard */}
        <div className="impact-scorecard glass">
          <div className="scorecard-header">
            <Trophy size={22} style={{ color: '#fbbf24' }} />
            <h3>Department Performance Scorecard</h3>
            <span className="live-badge">LIVE</span>
          </div>
          <div className="scorecard-grid">
            <div className="score-item"><div className="score-label">Public Works</div><div className="score-bar"><div className="score-fill" style={{ width: '94%', background: '#10b981' }}></div></div><div className="score-value">94% <span className="trend-up">↑12%</span></div></div>
            <div className="score-item"><div className="score-label">Water Board</div><div className="score-bar"><div className="score-fill" style={{ width: '87%', background: '#10b981' }}></div></div><div className="score-value">87% <span className="trend-up">↑8%</span></div></div>
            <div className="score-item"><div className="score-label">Sanitation Dept</div><div className="score-bar"><div className="score-fill" style={{ width: '76%', background: '#f59e0b' }}></div></div><div className="score-value">76% <span className="trend-up">↑5%</span></div></div>
            <div className="score-item"><div className="score-label">Electricity Board</div><div className="score-bar"><div className="score-fill" style={{ width: '82%', background: '#10b981' }}></div></div><div className="score-value">82% <span className="trend-up">↑15%</span></div></div>
          </div>
          <div className="scorecard-footer"><span>🏆 Top Performer: Public Works Department</span><span>⚡ Fastest Improvement: Electricity Board (+15%)</span></div>
        </div>

        {/* Filters */}
        <div className="filters-bar glass">
          <div className="search-box"><Search size={16} /><input type="text" placeholder="Search complaints..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="all">All Status</option>{statuses.slice(1).map(s => <option key={s} value={s}>{s}</option>)}</select>
          <select className="filter-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}><option value="all">All Priorities</option>{priorities.slice(1).map(p => <option key={p} value={p}>{p}</option>)}</select>
        </div>

        {/* Charts Row */}
        <div className="charts-row">
          <div className="chart-card glass"><h3>📊 Complaint Status</h3>{statusChartData && <Doughnut data={statusChartData} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { color: 'white' } } } }} />}</div>
          <div className="chart-card glass"><h3>📊 Priority Distribution</h3>{priorityChartData && <Bar data={priorityChartData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } }, x: { ticks: { color: 'white' } } } }} />}</div>
          <div className="chart-card glass"><h3>📈 Monthly Trend</h3><Line data={monthlyTrendData} options={{ responsive: true, plugins: { legend: { labels: { color: 'white' } } }, scales: { y: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } }, x: { ticks: { color: 'white' } } } }} /></div>
          <div className="chart-card glass"><h3>📈 Raised vs Resolved</h3><Line data={resolutionData} options={{ responsive: true, plugins: { legend: { labels: { color: 'white' } } }, scales: { y: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } }, x: { ticks: { color: 'white' } } } }} /></div>
        </div>

        {/* Real-time Hotspot Map */}
        <div className="hotspot-card glass">
          <div className="hotspot-header">
            <div className="hotspot-title"><span>🔥</span><h3>Live Issue Hotspots</h3><span className="hotspot-badge">{issues.length} Active Issues</span></div>
            <div className="hotspot-legend">
              <div className="legend-dot critical"></div><span>Critical (10+ reports)</span>
              <div className="legend-dot high"></div><span>High (5-9 reports)</span>
              <div className="legend-dot medium"></div><span>Medium (2-4 reports)</span>
              <div className="legend-dot low"></div><span>Low (1 report)</span>
            </div>
          </div>
          <div className="map-container-wrapper">
            <MapContainer key="bangalore-map" center={[12.9716, 77.5946]} zoom={12} style={{ height: '400px', width: '100%', borderRadius: '16px', zIndex: 1 }} scrollWheelZoom={true}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> | Bengaluru' />
              {heatmapPoints.map((point, idx) => {
                let color = '#10b981';
                let size = 12;
                if (point.complaintCount > 10) { color = '#dc2626'; size = 28; }
                else if (point.complaintCount > 5) { color = '#f59e0b'; size = 22; }
                else if (point.complaintCount > 2) { color = '#3b82f6'; size = 16; }
                return (
                  <CircleMarker key={idx} center={[point.lat, point.lng]} radius={size} fillColor={color} color={color} weight={2} opacity={0.8} fillOpacity={0.4}>
                    <Popup>
                      <div className="hotspot-popup">
                        <strong>📍 {point.title}</strong>
                        <div className="popup-stats"><span>📊 {point.complaintCount} reports</span><span>⚡ {point.priority} priority</span></div>
                        <button className="popup-view" onClick={() => { const issue = issues.find(i => i.issueTitle === point.title); if (issue) { setSelectedIssue(issue); setShowDetailModal(true); } }}>View Details →</button>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
          <div className="hotspot-footer">
            <div className="stat-circle"><span className="stat-number">{issues.filter(i => i.complaintCount > 10).length}</span><span className="stat-label">Critical Zones</span></div>
            <div className="stat-circle"><span className="stat-number">{issues.reduce((sum, i) => sum + i.complaintCount, 0)}</span><span className="stat-label">Total Affected</span></div>
            <div className="stat-circle"><span className="stat-number">{stats?.resolutionRate || 0}%</span><span className="stat-label">Resolution Rate</span></div>
          </div>
        </div>

        {/* Issues List */}
        <div className="issues-card glass">
          <h3><TrendingUp size={18} /> Active Issues</h3>
          <div className="issues-list">
            {issues.length === 0 ? <div className="empty-state">No issues found</div> : issues.map(issue => (
              <div key={issue.id} className="issue-item" onClick={() => { setSelectedIssue(issue); setShowDetailModal(true); }}>
                <div className="issue-priority" style={{ background: getPriorityColor(issue.priority) }}>{issue.priority}</div>
                <div className="issue-details">
                  <div className="issue-title">{issue.issueTitle}</div>
                  <div className="issue-meta">
                    <span><TrendingUp size={12} /> {issue.complaintCount} reports</span>
                    <span><MapPin size={12} /> Ward {issue.ward}</span>
                    {getStatusIcon(issue.status)}<span>{issue.status}</span>
                  </div>
                </div>
                <div className="issue-stats">
                  <span><ThumbsUp size={12} style={{ color: '#10b981' }} /> {issue.upvotes?.yes || 0} verified</span>
                  <span><ThumbsDown size={12} style={{ color: '#ef4444' }} /> {issue.upvotes?.no || 0} not fixed</span>
                  <span><Eye size={12} /> Click to view</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showDetailModal && selectedIssue && <DetailModal issue={selectedIssue} onClose={() => setShowDetailModal(false)} />}
    </div>
  );
};

export default WardDashboard;