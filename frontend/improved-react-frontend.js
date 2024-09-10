// src/App.js
// import React from 'react';
// import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
// import { AuthProvider } from './contexts/AuthContext';
// import PrivateRoute from './components/PrivateRoute';
// import Login from './components/Login';
// import Register from './components/Register';
// import RoomList from './components/RoomList';
// import ChatRoom from './components/ChatRoom';
// import AdminPanel from './components/AdminPanel';
// import Navigation from './components/Navigation';

// function App() {
//   return (
//     <AuthProvider>
//       <Router>
//         <div className="app-container">
//           <Navigation />
//           <Switch>
//             <Route exact path="/" component={() => <h1>Welcome to the Chat App</h1>} />
//             <Route path="/login" component={Login} />
//             <Route path="/register" component={Register} />
//             <PrivateRoute path="/rooms" exact component={RoomList} />
//             <PrivateRoute path="/room/:roomId" component={ChatRoom} />
//             <PrivateRoute path="/admin" component={AdminPanel} />
//             <Redirect to="/" />
//           </Switch>
//         </div>
//       </Router>
//     </AuthProvider>
//   );
// }

// export default App;





// src/contexts/AuthContext.js
// import React, { createContext, useState, useContext, useEffect } from 'react';

// const AuthContext = createContext();

// export function useAuth() {
//   return useContext(AuthContext);
// }

// export function AuthProvider({ children }) {
//   const [token, setToken] = useState(localStorage.getItem('token'));
//   const [user, setUser] = useState(null);

//   useEffect(() => {
//     if (token) {
//       localStorage.setItem('token', token);
//       // Decode JWT to get user info
//       const payload = JSON.parse(atob(token.split('.')[1]));
//       setUser(payload);
//     } else {
//       localStorage.removeItem('token');
//       setUser(null);
//     }
//   }, [token]);

//   const value = {
//     token,
//     setToken,
//     user,
//     isAdmin: user?.isAdmin || false,
//   };

//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// }



// src/components/PrivateRoute.js
// import React from 'react';
// import { Route, Redirect } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';

// function PrivateRoute({ component: Component, ...rest }) {
//   const { token } = useAuth();

//   return (
//     <Route
//       {...rest}
//       render={(props) =>
//         token ? <Component {...props} /> : <Redirect to="/login" />
//       }
//     />
//   );
// }

// export default PrivateRoute;




// src/components/Navigation.js
// import React from 'react';
// import { Link } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';

// function Navigation() {
//   const { token, setToken, isAdmin } = useAuth();

//   return (
//     <nav>
//       <ul>
//         <li><Link to="/">Home</Link></li>
//         {!token && (
//           <>
//             <li><Link to="/login">Login</Link></li>
//             <li><Link to="/register">Register</Link></li>
//           </>
//         )}
//         {token && (
//           <>
//             <li><Link to="/rooms">Rooms</Link></li>
//             {isAdmin && <li><Link to="/admin">Admin</Link></li>}
//             <li><button onClick={() => setToken(null)}>Logout</button></li>
//           </>
//         )}
//       </ul>
//     </nav>
//   );
// }

// export default Navigation;




// src/components/Login.js
// import React, { useState } from 'react';
// import { useHistory } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';
// import api from '../utils/api';

// function Login() {
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const { setToken } = useAuth();
//   const history = useHistory();

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     try {
//       const response = await api.post('/login', { username, password });
//       setToken(response.data.token);
//       history.push('/rooms');
//     } catch (error) {
//       setError('Invalid credentials');
//     }
//   };

//   return (
//     <div>
//       <h2>Login</h2>
//       {error && <p className="error">{error}</p>}
//       <form onSubmit={handleLogin}>
//         <input
//           type="text"
//           placeholder="Username"
//           value={username}
//           onChange={(e) => setUsername(e.target.value)}
//         />
//         <input
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//         />
//         <button type="submit">Login</button>
//       </form>
//     </div>
//   );
// }

// export default Login;





// src/components/Register.js
// import React, { useState } from 'react';
// import { useHistory } from 'react-router-dom';
// import api from '../utils/api';

// function Register() {
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [email, setEmail] = useState('');
//   const [error, setError] = useState('');
//   const history = useHistory();

//   const handleRegister = async (e) => {
//     e.preventDefault();
//     try {
//       await api.post('/register', { username, password, email });
//       history.push('/login');
//     } catch (error) {
//       setError('Error registering user');
//     }
//   };

//   return (
//     <div>
//       <h2>Register</h2>
//       {error && <p className="error">{error}</p>}
//       <form onSubmit={handleRegister}>
//         <input
//           type="text"
//           placeholder="Username"
//           value={username}
//           onChange={(e) => setUsername(e.target.value)}
//         />
//         <input
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//         />
//         <input
//           type="email"
//           placeholder="Email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//         />
//         <button type="submit">Register</button>
//       </form>
//     </div>
//   );
// }

// export default Register;






// src/components/RoomList.js
// import React, { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom';
// import api from '../utils/api';

// function RoomList() {
//   const [rooms, setRooms] = useState([]);
//   const [newRoomName, setNewRoomName] = useState('');
//   const [error, setError] = useState('');

//   useEffect(() => {
//     fetchRooms();
//   }, []);

//   const fetchRooms = async () => {
//     try {
//       const response = await api.get('/rooms');
//       setRooms(response.data);
//     } catch (error) {
//       setError('Error fetching rooms');
//     }
//   };

//   const createRoom = async (e) => {
//     e.preventDefault();
//     try {
//       await api.post('/rooms', { name: newRoomName });
//       setNewRoomName('');
//       fetchRooms();
//     } catch (error) {
//       setError('Error creating room');
//     }
//   };

//   return (
//     <div>
//       <h2>Rooms</h2>
//       {error && <p className="error">{error}</p>}
//       <form onSubmit={createRoom}>
//         <input
//           type="text"
//           placeholder="New room name"
//           value={newRoomName}
//           onChange={(e) => setNewRoomName(e.target.value)}
//         />
//         <button type="submit">Create Room</button>
//       </form>
//       <ul>
//         {rooms.map((room) => (
//           <li key={room.id}>
//             <Link to={`/room/${room.id}`}>{room.name}</Link>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// export default RoomList;






// src/components/ChatRoom.js
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';
// import io from 'socket.io-client';

// function ChatRoom() {
//   const { roomId } = useParams();
//   const { token, user } = useAuth();
//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState('');
//   const [users, setUsers] = useState([]);
//   const socketRef = useRef();

//   useEffect(() => {
//     socketRef.current = io(process.env.REACT_APP_SOCKET_URL, {
//       query: { token }
//     });

//     socketRef.current.emit('join room', { roomId, token });

//     socketRef.current.on('new message', (msg) => {
//       setMessages((prevMessages) => [...prevMessages, msg]);
//     });

//     socketRef.current.on('message deleted', (messageId) => {
//       setMessages((prevMessages) => prevMessages.filter(m => m.id !== messageId));
//     });

//     socketRef.current.on('user joined', ({ username, users }) => {
//       setUsers(users);
//     });

//     return () => {
//       socketRef.current.disconnect();
//     };
//   }, [roomId, token]);

//   const sendMessage = (e) => {
//     e.preventDefault();
//     if (newMessage.trim()) {
//       socketRef.current.emit('send message', { roomId, message: newMessage, token });
//       setNewMessage('');
//     }
//   };

//   const deleteMessage = (messageId) => {
//     socketRef.current.emit('delete message', { roomId, messageId, token });
//   };

//   return (
//     <div>
//       <h2>Room: {roomId}</h2>
//       <div className="message-container">
//         {messages.map((msg) => (
//           <div key={msg.id} className="message">
//             <strong>{msg.username}:</strong> {msg.content}
//             {(user.username === msg.username || user.isAdmin) && (
//               <button onClick={() => deleteMessage(msg.id)}>Delete</button>
//             )}
//           </div>
//         ))}
//       </div>
//       <form onSubmit={sendMessage}>
//         <input
//           type="text"
//           value={newMessage}
//           onChange={(e) => setNewMessage(e.target.value)}
//           placeholder="Type your message..."
//         />
//         <button type="submit">Send</button>
//       </form>
//       <div>
//         <h3>Users in room:</h3>
//         <ul>
//           {users.map((username) => (
//             <li key={username}>{username}</li>
//           ))}
//         </ul>
//       </div>
//     </div>
//   );
// }

// export default ChatRoom;











// src/components/AdminPanel.js
// import React, { useState, useEffect } from 'react';
// import api from '../utils/api';

// function AdminPanel() {
//   const [users, setUsers] = useState([]);
//   const [rooms, setRooms] = useState([]);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     fetchUsers();
//     fetchRooms();
//   }, []);

//   const fetchUsers = async () => {
//     try {
//       const response = await api.get('/admin/users');
//       setUsers(response.data);
//     } catch (error) {
//       setError('Error fetching users');
//     }
//   };

//   const fetchRooms = async () => {
//     try {
//       const response = await api.get('/admin/rooms');
//       setRooms(response.data);
//     } catch (error) {
//       setError('Error fetching rooms');
//     }
//   };

//   return (
//     <div>
//       <h2>Admin Panel</h2>
//       {error && <p className="error">{error}</p>}
//       <h3>Users</h3>
//       <ul>
//         {users.map((user) => (
//           <li key={user.id}>
//             {user.username} (Admin: {user.isAdmin ? 'Yes' : 'No'})
//           </li>
//         ))}
//       </ul>
//       <h3>Rooms</h3>
//       <ul>
//         {rooms.map((room) => (
//           <li key={room.id}>
//             {room.name} (Users: {room.Users.length})
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// export default AdminPanel;











// src/utils/api.js
// import axios from 'axios';

// const api = axios.create({
//   baseURL: process.env.REACT_APP_API_URL,
// });

// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('token');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// export default api;
