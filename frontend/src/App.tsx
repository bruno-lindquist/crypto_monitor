import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import CryptoList from './pages/CryptoList'
import CryptoDetail from './pages/CryptoDetail'
import Alerts from './pages/Alerts'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="cryptos" element={<CryptoList />} />
          <Route path="cryptos/:id" element={<CryptoDetail />} />
          <Route path="alerts" element={<Alerts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
