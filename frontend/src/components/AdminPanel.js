import React, { useState, useEffect } from 'react';
import api from '../utils/api';

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchRooms();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      setError('Error fetching users');
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await api.get('/admin/rooms');
      setRooms(response.data);
    } catch (error) {
      setError('Error fetching rooms');
    }
  };

  return (
    <div>
      <h2>Admin Panel</h2>
      {error && <p className="error">{error}</p>}
      <h3>Users</h3>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.username} (Admin: {user.isAdmin ? 'Yes' : 'No'})
          </li>
        ))}
      </ul>
      <h3>Rooms</h3>
      <ul>
        {rooms.map((room) => (
          <li key={room.id}>
            {room.name} (Users: {room.Users.length})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminPanel;