import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Navigation() {
  const { token, setToken, isAdmin } = useAuth();

  return (
    <nav>
      <ul>
        <li><Link to="/">Home</Link></li>
        {!token && (
          <>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register">Register</Link></li>
          </>
        )}
        {token && (
          <>
            <li><Link to="/rooms">Rooms</Link></li>
            {isAdmin && <li><Link to="/admin">Admin</Link></li>}
            <li><button onClick={() => setToken(null)}>Logout</button></li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navigation;