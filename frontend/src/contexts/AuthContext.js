import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      // Decode JWT to get user info
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser(payload);
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const value = {
    token,
    setToken,
    user,
    isAdmin: user?.isAdmin || false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
