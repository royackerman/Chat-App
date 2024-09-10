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

import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';  // Updated imports
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './components/Login';
import Register from './components/Register';
import RoomList from './components/RoomList';
import ChatRoom from './components/ChatRoom';
import AdminPanel from './components/AdminPanel';
import Navigation from './components/Navigation';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navigation />
          <Routes>  {/* Updated Switch to Routes */}
            <Route path="/" element={<h1>Welcome to the Chat App</h1>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/rooms" element={<PrivateRoute><RoomList /></PrivateRoute>} />
            <Route path="/room/:roomId" element={<PrivateRoute><ChatRoom /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />  {/* Updated Redirect to Navigate */}
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;


