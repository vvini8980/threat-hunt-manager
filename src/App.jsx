import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import TopBar from './components/Layout/TopBar'
import BottomNav from './components/Layout/BottomNav'
import ErrorBoundary from './components/Common/ErrorBoundary'
import AddEdit from './pages/AddEdit'
import Campaigns from './pages/Campaigns'
import Coverage from './pages/Coverage'
import Dashboard from './pages/Dashboard'
import Hypotheses from './pages/Hypotheses'
import Import from './pages/Import'
import { ToastProvider } from './context/ToastContext'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-bg-primary text-textprimary">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <TopBar toggleSidebar={() => setIsSidebarOpen(true)} />
          <main className="md:ml-[240px] h-screen overflow-y-auto bg-bg-primary px-6 pb-20 pt-[84px] md:pb-6">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/hypotheses" element={<Hypotheses />} />
                <Route path="/coverage" element={<Coverage />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/import" element={<Import />} />
                <Route path="/add" element={<AddEdit />} />
                <Route path="/edit/:id" element={<AddEdit />} />
              </Routes>
            </ErrorBoundary>
          </main>
          <BottomNav />
        </div>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
