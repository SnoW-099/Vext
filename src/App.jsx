import { useState, useRef, useEffect } from 'react'
import './App.css'
import EntryScreen from './components/EntryScreen'
import LoadingScreen from './components/LoadingScreen'
import Workspace from './components/Workspace'
import { analyzeHypothesis, getMockAnalysis } from './services/vextApi'

// Set to true for local dev without API, false for production
const USE_MOCK_API = import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API

import Dashboard from './components/Dashboard'

function App() {
  const [stage, setStage] = useState('dashboard') // 'dashboard' | 'entry' | 'loading' | 'results'
  const [hypothesis, setHypothesis] = useState('')
  const [analysisData, setAnalysisData] = useState(null)
  const [currentProject, setCurrentProject] = useState(null)
  const [error, setError] = useState(null)
  const apiCallRef = useRef(null)

  const handleNewProject = () => {
    setStage('entry')
    setHypothesis('')
    setAnalysisData(null)
    setCurrentProject(null)
  }

  const handleLoadProject = (project) => {
    setCurrentProject(project)
    setHypothesis(project.hypothesis || '')
    setAnalysisData({
      grade: project.grade,
      gradePercent: project.gradePercent,
      websitePreview: project.websitePreview,
      psychology: project.psychology,
      // reconstitute other data if needed
    })
    setStage('results')
  }

  const handleScan = (inputHypothesis) => {
    setHypothesis(inputHypothesis)
    setError(null)
    setStage('loading')

    // Start API call in parallel with loading animation
    console.log('[VEXT] Mode:', USE_MOCK_API ? 'MOCK' : 'REAL API')
    apiCallRef.current = USE_MOCK_API
      ? Promise.resolve(getMockAnalysis(inputHypothesis))
      : analyzeHypothesis(inputHypothesis)
  }

  const handleLoadingComplete = async () => {
    try {
      // Wait for API call to complete
      const data = await apiCallRef.current
      setAnalysisData(data)
      setStage('results')
    } catch (err) {
      console.error('Analysis failed:', err)
      setError(err.message)
      // Fall back to mock data on error
      setAnalysisData(getMockAnalysis(hypothesis))
      setStage('results')
    }
  }

  const handleReset = () => {
    setStage('dashboard')
    setHypothesis('')
    setAnalysisData(null)
    setCurrentProject(null)
    setError(null)
    apiCallRef.current = null
  }

  return (
    <div className="app">
      {stage === 'dashboard' && (
        <Dashboard
          onNewProject={handleNewProject}
          onLoadProject={handleLoadProject}
        />
      )}
      {stage === 'entry' && (
        <EntryScreen onScan={handleScan} />
      )}
      {stage === 'loading' && (
        <LoadingScreen
          hypothesis={hypothesis}
          onComplete={handleLoadingComplete}
        />
      )}
      {stage === 'results' && (
        <Workspace
          hypothesis={hypothesis}
          data={analysisData}
          onReset={handleReset}
          error={error}
          currentProject={currentProject} // Pass project to workspace
        />
      )}
    </div>
  )
}

export default App
