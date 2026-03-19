import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { PageLoader } from './components/LoadingSpinner'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'

const CryptoList = lazy(() => import('./pages/CryptoList'))
const CryptoDetail = lazy(() => import('./pages/CryptoDetail'))
const Alerts = lazy(() => import('./pages/Alerts'))
const withLoader = (page: JSX.Element) => <Suspense fallback={<PageLoader />}>{page}</Suspense>
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="cryptos" element={withLoader(<CryptoList />)} />
          <Route path="cryptos/:id" element={withLoader(<CryptoDetail />)} />
          <Route path="alerts" element={withLoader(<Alerts />)} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
