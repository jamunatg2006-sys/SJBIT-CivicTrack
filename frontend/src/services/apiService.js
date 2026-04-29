import axios from 'axios';

// Real API endpoints (using free public APIs)
const API_BASE = 'https://jsonplaceholder.typicode.com';
const REDDIT_API = 'https://www.reddit.com/r/india/hot.json';

// Fetch real posts from Reddit (India subreddit for civic issues)
export const fetchCommunityPosts = async () => {
  try {
    const response = await axios.get(`${REDDIT_API}?limit=15`);
    return response.data.data.children.map(post => ({
      id: post.data.id,
      title: post.data.title,
      content: post.data.selftext || 'No description provided',
      ups: post.data.ups,
      downs: post.data.downs,
      score: post.data.score,
      upvoteRatio: post.data.upvote_ratio,
      numComments: post.data.num_comments,
      author: post.data.author,
      created: post.data.created_utc,
      url: post.data.url,
      type: 'reddit'
    }));
  } catch (error) {
    console.error('Error fetching Reddit posts:', error);
    return [];
  }
};

// Fetch users from JSONPlaceholder
export const fetchUsers = async () => {
  try {
    const response = await axios.get(`${API_BASE}/users`);
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

// Fetch posts from JSONPlaceholder
export const fetchPosts = async () => {
  try {
    const response = await axios.get(`${API_BASE}/posts`);
    return response.data;
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
};

// Fetch comments
export const fetchComments = async (postId) => {
  try {
    const response = await axios.get(`${API_BASE}/posts/${postId}/comments`);
    return response.data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

// Mock API for civic issues (simulating real data)
export const fetchCivicIssues = async () => {
  // This simulates real API data - in production, connect to a real civic API
  const mockCivicData = [
    { id: 1, title: "Pothole on MG Road", votes: 234, status: "Open", ward: "Ward 3", time: "2 hours ago", category: "Roads" },
    { id: 2, title: "Garbage not collected for 5 days", votes: 567, status: "In Progress", ward: "Ward 5", time: "1 day ago", category: "Sanitation" },
    { id: 3, title: "Street light broken", votes: 89, status: "Open", ward: "Ward 8", time: "5 hours ago", category: "Electricity" },
    { id: 4, title: "Water leakage on main pipeline", votes: 432, status: "Urgent", ward: "Ward 2", time: "3 hours ago", category: "Water" },
    { id: 5, title: "Illegal construction", votes: 876, status: "Review", ward: "Ward 11", time: "1 hour ago", category: "Other" },
  ];
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockCivicData;
};

// Vote on an issue (POST request)
export const voteOnIssue = async (issueId, voteType) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));
  return { success: true, message: `Voted ${voteType} on issue ${issueId}` };
};