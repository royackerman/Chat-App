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

import React from 'react';
import { Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function PrivateRoute({ component: Component, ...rest }) {
  const { token } = useAuth();

  return (
    <Route
      {...rest}
      render={(props) =>
        token ? <Component {...props} /> : <Navigate to="/login" />
      }
    />
  );
}

export default PrivateRoute;