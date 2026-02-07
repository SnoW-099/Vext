import { useState, useRef, useEffect } from 'react'
import './App.css'
import EntryScreen from './components/EntryScreen'
import LoadingScreen from './components/LoadingScreen'
import Workspace from './components/Workspace'
import { analyzeHypothesis, getMockAnalysis } from './services/vextApi'

// Set to true for local dev without API, false for production
const USE_MOCK_API = import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API

import Dashboard from './components/Dashboard'

import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [stage, setStage] = useState('dashboard') // 'dashboard' | 'entry' | 'loading' | 'results' | 'transition'
  const [targetStage, setTargetStage] = useState(null)
  const [hypothesis, setHypothesis] = useState('')
  const [analysisData, setAnalysisData] = useState(null)
  const [currentProject, setCurrentProject] = useState(null)
  const [error, setError] = useState(null)
  const apiCallRef = useRef(null)

  // Sync stage with URL for Dashboard
  useEffect(() => {
    if (location.pathname === '/' || location.pathname.length > 1) {
      // If we are on a category path and not in a flow, show dashboard
      if (stage !== 'entry' && stage !== 'loading' && stage !== 'results' && stage !== 'transition') {
        setStage('dashboard')
      }
    }
  }, [location.pathname, stage])

  const startTransition = (nextStage) => {
    setTargetStage(nextStage)
    setStage('transition')
  }

  const handleTransitionComplete = () => {
    if (targetStage) {
      setStage(targetStage)
      setTargetStage(null)
    }
  }

  const handleNewProject = () => {
    setHypothesis('')
    setAnalysisData(null)
    setCurrentProject(null)
    startTransition('entry')
  }

  const handleLoadProject = (project) => {
    setCurrentProject(project)
    setHypothesis(project.hypothesis || '')
    setAnalysisData({ ...project })
    startTransition('results')
  }

  const handleScan = (inputHypothesis) => {
    setHypothesis(inputHypothesis)
    setError(null)
    setStage('loading')

    apiCallRef.current = USE_MOCK_API
      ? Promise.resolve(getMockAnalysis(inputHypothesis))
      : analyzeHypothesis(inputHypothesis)
  }

  const handleLoadingComplete = async () => {
    try {
      const data = await apiCallRef.current
      setAnalysisData(data)
      setStage('results')
    } catch (err) {
      console.error('Analysis failed:', err)
      setError(err.message)
      setAnalysisData(getMockAnalysis(hypothesis))
      setStage('results')
    }
  }

  const handleReset = () => {
    setHypothesis('')
    setAnalysisData(null)
    setCurrentProject(null)
    setError(null)
    apiCallRef.current = null
    navigate('/')
    startTransition('dashboard')
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={
          stage === 'dashboard' ? (
            <Dashboard
              onNewProject={handleNewProject}
              onLoadProject={handleLoadProject}
            />
          ) : null
        } />
        <Route path="/:category" element={
          stage === 'dashboard' ? (
            <Dashboard
              onNewProject={handleNewProject}
              onLoadProject={handleLoadProject}
            />
          ) : null
        } />
      </Routes>

      {stage === 'entry' && (
        <EntryScreen onScan={handleScan} />
      )}
      {stage === 'loading' && (
        <LoadingScreen
          hypothesis={hypothesis}
          onComplete={handleLoadingComplete}
          mode="analysis"
        />
      )}
      {stage === 'transition' && (
        <LoadingScreen
          hypothesis={hypothesis || 'Loading...'}
          onComplete={handleTransitionComplete}
          mode="transition"
        />
      )}
      {stage === 'results' && (
        <Workspace
          hypothesis={hypothesis}
          data={analysisData}
          onReset={handleReset}
          error={error}
          currentProject={currentProject}
        />
      )}
    </div>
  )
}

export default App
