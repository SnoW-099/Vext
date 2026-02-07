import { useState } from 'react'
import './App.css'
import EntryScreen from './components/EntryScreen'
import LoadingScreen from './components/LoadingScreen'
import Workspace from './components/Workspace'

function App() {
  const [stage, setStage] = useState('entry') // 'entry' | 'loading' | 'results'
  const [hypothesis, setHypothesis] = useState('')
  const [analysisData, setAnalysisData] = useState(null)

  const handleScan = (inputHypothesis) => {
    setHypothesis(inputHypothesis)
    setStage('loading')
  }

  const handleLoadingComplete = () => {
    // Simulated analysis data
    setAnalysisData({
      grade: 'A',
      gradePercent: 87,
      targeting: 'Young professionals aged 25-35 seeking productivity solutions',
      psychology: ['Urgency', 'Social Proof', 'Authority'],
      websitePreview: {
        title: hypothesis.slice(0, 50) + '...',
        tagline: 'Transform your workflow today',
      }
    })
    setStage('results')
  }

  const handleReset = () => {
    setStage('entry')
    setHypothesis('')
    setAnalysisData(null)
  }

  return (
    <div className="app">
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
        />
      )}
    </div>
  )
}

export default App
