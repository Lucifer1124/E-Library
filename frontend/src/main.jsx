import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router-dom'
import router from './routers/router.jsx'
import  'sweetalert2/dist/sweetalert2.js'

import { Provider } from 'react-redux'
import { store } from './redux/store.js'
import { AuthProvide } from './context/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <AuthProvide>
      <RouterProvider router={router} />
    </AuthProvide>
  </Provider>,
)
