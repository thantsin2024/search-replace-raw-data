import React, { useState } from 'react'
import { copyToClipboard } from '../utils/copyToClipboard'
import serverInfo from '../info.json'

function ServerList() {
  const [servers] = useState(serverInfo)
  const [copiedId, setCopiedId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter servers by brand
  const filteredServers = searchTerm.trim() === '' 
    ? servers 
    : servers.filter(server => 
        server.brand.toLowerCase().includes(searchTerm.toLowerCase())
      )

  const handleCopyOpenPort = async (server) => {
    const messageTemplate = `@aclbot
server: ${server.serverName}
port: 22000
sourceName: thant
duration: 1h
purpose: to check log`
    
    const success = await copyToClipboard(messageTemplate)
    if (success) {
      setCopiedId(server.serverName)
      setTimeout(() => setCopiedId(null), 2000)
    } else {
      alert('Failed to copy. Please try again.')
    }
  }

  const handleCopyCard = async (server) => {
    const cardData = JSON.stringify(server, null, 2)
    const success = await copyToClipboard(cardData)
    if (success) {
      setCopiedId(`card-${server.serverName}`)
      setTimeout(() => setCopiedId(null), 2000)
    } else {
      alert('Failed to copy. Please try again.')
    }
  }

  return (
    <div className="server-list-container">
      <div className="server-list-header">
        <h2 className="server-list-title">Server List</h2>
        <div className="server-count">{filteredServers.length} server{filteredServers.length !== 1 ? 's' : ''}</div>
      </div>
      
      <div className="server-search-container">
        <input
          type="text"
          className="server-search-input"
          placeholder="Search by brand..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="server-cards-grid">
        {filteredServers.map((server, index) => (
          <div 
            key={index} 
            className="server-card"
            onClick={() => handleCopyCard(server)}
            title="Click card to copy server data"
          >
            <div className="server-card-header">
              <h3 className="server-name">{server.brand}</h3>
              <span className="server-brand">{server.serverName}</span>
            </div>
            
            <div className="server-card-body">
              <div className="server-info-item">
                <span className="server-info-label">Brand Code:</span>
                <span className="server-info-value">{server.brandCode}</span>
              </div>
              <div className="server-info-item">
                <span className="server-info-label">Server IP:</span>
                <span className="server-info-value">{server.serverIP}</span>
              </div>
              {server.openPort && (
                <div className="server-info-item">
                  <span className="server-info-label">Open Port:</span>
                  <span className="server-info-value">{server.openPort}</span>
                </div>
              )}
            </div>
            
            <div className="server-card-footer">
              {copiedId === `card-${server.serverName}` && (
                <span className="copy-indicator">Card copied!</span>
              )}
              <button
                className={`button button-copy-openport ${copiedId === server.serverName ? 'copied' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyOpenPort(server)
                }}
              >
                {copiedId === server.serverName ? '✓ Copied!' : 'copy-openPort'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ServerList
