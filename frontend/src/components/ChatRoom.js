import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';

function ChatRoom() {
  const { roomId } = useParams();
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io(process.env.REACT_APP_SOCKET_URL, {
      query: { token }
    });

    socketRef.current.emit('join room', { roomId, token });

    socketRef.current.on('new message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    socketRef.current.on('message deleted', (messageId) => {
      setMessages((prevMessages) => prevMessages.filter(m => m.id !== messageId));
    });

    socketRef.current.on('user joined', ({ username, users }) => {
      setUsers(users);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId, token]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      socketRef.current.emit('send message', { roomId, message: newMessage, token });
      setNewMessage('');
    }
  };

  const deleteMessage = (messageId) => {
    socketRef.current.emit('delete message', { roomId, messageId, token });
  };

  return (
    <div>
      <h2>Room: {roomId}</h2>
      <div className="message-container">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <strong>{msg.username}:</strong> {msg.content}
            {(user.username === msg.username || user.isAdmin) && (
              <button onClick={() => deleteMessage(msg.id)}>Delete</button>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button type="submit">Send</button>
      </form>
      <div>
        <h3>Users in room:</h3>
        <ul>
          {users.map((username) => (
            <li key={username}>{username}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ChatRoom;