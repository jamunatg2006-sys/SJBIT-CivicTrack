import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing user session
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Login function - works with localStorage
  const login = async (email, password) => {
    try {
      // Get registered users from localStorage
      const storedUsers = localStorage.getItem('civictrack_users');
      let users = storedUsers ? JSON.parse(storedUsers) : [];
      
      // Find user by email
      const user = users.find(u => u.email === email);
      
      // Check if user exists and password matches (simple check for demo)
      if (!user) {
        return { success: false, error: 'User not found. Please register first.' };
      }
      
      // For demo, accept any password (in real app, you'd compare hashed passwords)
      // You can add a simple check if needed
      if (password !== user.password && user.password !== 'password123') {
        // For seeded users, accept 'password123' or 'user123'
        if (password !== 'password123' && password !== 'user123' && password !== user.password) {
          return { success: false, error: 'Invalid password' };
        }
      }
      
      // Create session
      const token = `token_${user.id}_${Date.now()}`;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      return { success: true, user };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  // Google Login function
  const googleLogin = async (userData) => {
    try {
      const storedUsers = localStorage.getItem('civictrack_users');
      let users = storedUsers ? JSON.parse(storedUsers) : [];
      
      let user = users.find(u => u.email === userData.email);
      
      if (!user) {
        // Create new user
        user = {
          id: Date.now(),
          name: userData.name,
          email: userData.email,
          picture: userData.picture,
          role: 'citizen',
          points: 0,
          isGoogleUser: true
        };
        users.push(user);
        localStorage.setItem('civictrack_users', JSON.stringify(users));
      }
      
      const token = `google_token_${user.id}`;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      return { success: true, user };
    } catch (err) {
      return { success: false, error: 'Google login failed' };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      const storedUsers = localStorage.getItem('civictrack_users');
      let users = storedUsers ? JSON.parse(storedUsers) : [];
      
      // Check if user already exists
      if (users.find(u => u.email === userData.email)) {
        return { success: false, error: 'User already exists. Please login.' };
      }
      
      // Create new user
      const newUser = {
        id: Date.now(),
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role || 'citizen',
        points: 0,
        createdAt: new Date().toISOString()
      };
      
      users.push(newUser);
      localStorage.setItem('civictrack_users', JSON.stringify(users));
      
      // Auto login after registration
      const token = `token_${newUser.id}_${Date.now()}`;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      
      return { success: true, user: newUser };
    } catch (err) {
      return { success: false, error: 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, googleLogin }}>
      {children}
    </AuthContext.Provider>
  );
};