import { User } from '../types';

const STORAGE_KEY = 'toolbox_user';

export const auth = {
  // Get current user
  getCurrentUser: (): User | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  // Save user session
  saveUser: (user: User): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  },

  // Clear user session
  logout: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  },

  // Simple email validation
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Check if username is available (simple check against stored users)
  isUsernameAvailable: (username: string): boolean => {
    const users = auth.getAllUsers();
    return !users.some(user => user.username.toLowerCase() === username.toLowerCase());
  },

  // Get all users (for username checking)
  getAllUsers: (): User[] => {
    try {
      const stored = localStorage.getItem('all_users');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  // Save user to users list
  saveUserToList: (user: User): void => {
    const users = auth.getAllUsers();
    const existingIndex = users.findIndex(u => u.email === user.email);
    
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    
    localStorage.setItem('all_users', JSON.stringify(users));
  },

  // Simple login (email + password check)
  login: (email: string, password: string): User | null => {
    const users = auth.getAllUsers();
    const user = users.find(u => u.email === email);
    
    if (user) {
      // In a real app, you'd hash and compare passwords
      // For this demo, we'll store a simple hash
      const storedPassword = localStorage.getItem(`pwd_${user.id}`);
      if (storedPassword === btoa(password)) {
        auth.saveUser(user);
        return user;
      }
    }
    
    return null;
  },

  // Register new user
  register: (email: string, username: string, name: string, password: string): User | null => {
    if (!auth.isValidEmail(email)) {
      return null;
    }

    if (!auth.isUsernameAvailable(username)) {
      return null;
    }

    const users = auth.getAllUsers();
    if (users.some(u => u.email === email)) {
      return null; // Email already exists
    }

    const newUser: User = {
      id: `user_${Date.now()}`,
      email,
      username,
      name,
      createdAt: Date.now()
    };

    // Save password (base64 encoded for demo - use proper hashing in production)
    localStorage.setItem(`pwd_${newUser.id}`, btoa(password));
    
    auth.saveUserToList(newUser);
    auth.saveUser(newUser);
    
    return newUser;
  }
};