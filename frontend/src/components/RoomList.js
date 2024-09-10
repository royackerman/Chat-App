import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

function RoomList() {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await api.get('/rooms');
      setRooms(response.data);
    } catch (error) {
      setError('Error fetching rooms');
    }
  };

  const createRoom = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rooms', { name: newRoomName });
      setNewRoomName('');
      fetchRooms();
    } catch (error) {
      setError('Error creating room');
    }
  };

  return (
    <div>
      <h2>Rooms</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={createRoom}>
        <input
          type="text"
          placeholder="New room name"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
        />
        <button type="submit">Create Room</button>
      </form>
      <ul>
        {rooms.map((room) => (
          <li key={room.id}>
            <Link to={`/room/${room.id}`}>{room.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RoomList;