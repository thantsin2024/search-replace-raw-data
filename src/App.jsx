import React, { useState } from 'react'
import './App.css'
import SearchReplace from './components/SearchReplace'
import KeyExplorer from './components/KeyExplorer'
import ServerList from './components/ServerList'
import JsonTreeExplorer from './components/JsonTreeExplorer'
import DeploymentRequest from './components/DeploymentRequest'

function App() {
  const [activeTab, setActiveTab] = useState('server-list') // 'search-replace', 'key-explorer', 'server-list', 'json-tree', 'deployment-request'
  
  return (
    <div className="app">
      <div className="container">
        <h1 className="title">Search Replace Data</h1>
        
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'server-list' ? 'active' : ''}`}
            onClick={() => setActiveTab('server-list')}
          >
            Server List
          </button>
          <button
            className={`tab ${activeTab === 'json-tree' ? 'active' : ''}`}
            onClick={() => setActiveTab('json-tree')}
          >
            JSON Tree
          </button>
          <button
            className={`tab ${activeTab === 'deployment-request' ? 'active' : ''}`}
            onClick={() => setActiveTab('deployment-request')}
          >
            Deployment Request
          </button>
        </div>

        {activeTab === 'search-replace' && <SearchReplace />}
        {activeTab === 'json-tree' && <JsonTreeExplorer />}
        {activeTab === 'key-explorer' && <KeyExplorer />}
        {activeTab === 'server-list' && <ServerList />}
        {activeTab === 'deployment-request' && <DeploymentRequest />}
      </div>
    </div>
  )
}

export default App
