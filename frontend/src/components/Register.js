import React, { useState } from 'react';
// import { useHistory } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import api from '../utils/api';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  // const history = useHistory();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post('/register', { username, password, email });
      // history.push('/login');
         navigate('/login');      
    } catch (error) {
      setError('Error registering user');
    }
  };

  return (
    <div>
      <h2>Register</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit">Register</button>
      </form>
    </div>
  );
}

export default Register;
