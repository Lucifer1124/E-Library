import { Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

function App() {
  return (
    <>
      <Navbar />
      <main className='app-shell'>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

export default App
