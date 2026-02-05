import React, { useState } from 'react'
import { copyToClipboard } from '../utils/copyToClipboard'

function KeyExplorer() {
  const [jsonKey, setJsonKey] = useState('')
  const [jsonData, setJsonData] = useState('')
  const [childKeys, setChildKeys] = useState([])
  const [error, setError] = useState('')
  const [path, setPath] = useState('')

  // Function to get nested value from object using dot notation key
  const getNestedValue = (obj, path) => {
    if (!path || path.trim() === '') {
      return obj
    }
    const keys = path.split('.')
    let current = obj
    
    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined
      }
      current = current[key]
    }
    
    return current
  }

  // Function to extract all keys from an object recursively
  const extractKeys = (obj, prefix = '') => {
    const keys = []
    
    if (obj === null || obj === undefined) {
      return keys
    }

    if (Array.isArray(obj)) {
      // For arrays, show indices
      obj.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          const nestedKeys = extractKeys(item, `${prefix}[${index}]`)
          keys.push(...nestedKeys)
        }
      })
      return keys
    }

    if (typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const fullPath = prefix ? `${prefix}.${key}` : key
        const value = obj[key]
        
        // Add the key itself
        keys.push({
          key: key,
          fullPath: fullPath,
          type: getValueType(value),
          hasChildren: typeof value === 'object' && value !== null && !Array.isArray(value)
        })
        
        // Recursively get nested keys
        if (typeof value === 'object' && value !== null) {
          const nestedKeys = extractKeys(value, fullPath)
          keys.push(...nestedKeys)
        }
      })
    }
    
    return keys
  }

  // Function to get value type
  const getValueType = (value) => {
    if (value === null) return 'null'
    if (Array.isArray(value)) return 'array'
    if (typeof value === 'object') return 'object'
    return typeof value
  }

  const handleExplore = () => {
    setError('')
    setChildKeys([])
    setPath('')

    if (!jsonData.trim()) {
      setError('Please enter JSON data')
      return
    }

    try {
      const parsed = JSON.parse(jsonData)
      
      // Get the target object based on the key
      const targetObj = getNestedValue(parsed, jsonKey)
      
      if (targetObj === undefined) {
        setError(`Key "${jsonKey || 'root'}" not found in the JSON data`)
        return
      }

      if (typeof targetObj !== 'object' || targetObj === null) {
        setError(`Key "${jsonKey || 'root'}" does not have child keys (it's a ${getValueType(targetObj)})`)
        return
      }

      // Extract direct child keys only (not recursive)
      const directKeys = []
      if (Array.isArray(targetObj)) {
        targetObj.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            directKeys.push({
              key: `[${index}]`,
              fullPath: jsonKey ? `${jsonKey}[${index}]` : `[${index}]`,
              type: getValueType(item),
              hasChildren: typeof item === 'object' && item !== null
            })
          }
        })
      } else {
        Object.keys(targetObj).forEach(key => {
          const value = targetObj[key]
          directKeys.push({
            key: key,
            fullPath: jsonKey ? `${jsonKey}.${key}` : key,
            type: getValueType(value),
            hasChildren: typeof value === 'object' && value !== null && !Array.isArray(value)
          })
        })
      }

      setChildKeys(directKeys)
      setPath(jsonKey || 'root')
    } catch (err) {
      setError(`Invalid JSON: ${err.message}`)
    }
  }

  const handleClear = () => {
    setJsonKey('')
    setJsonData('')
    setChildKeys([])
    setError('')
    setPath('')
  }

  const handleCopyKey = async (keyPath) => {
    const success = await copyToClipboard(keyPath)
    if (success) {
      alert(`Copied "${keyPath}" to clipboard!`)
    } else {
      alert('Failed to copy. Please try selecting and copying manually.')
    }
  }

  return (
    <>
      <div className="form-group">
        <label htmlFor="json-key">JSON Key (leave empty for root, use dot notation for nested keys):</label>
        <input
          id="json-key"
          type="text"
          className="input"
          placeholder="e.g., user or user.profile (leave empty for root)"
          value={jsonKey}
          onChange={(e) => setJsonKey(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="json-data">JSON Data:</label>
        <textarea
          id="json-data"
          className="textarea"
          placeholder='Paste your JSON data here (e.g., {"user": {"name": "John", "email": "john@example.com"}})'
          value={jsonData}
          onChange={(e) => setJsonData(e.target.value)}
          rows="10"
        />
      </div>

      <div className="button-group">
        <button className="button button-primary" onClick={handleExplore}>
          Explore Keys
        </button>
        <button className="button button-secondary" onClick={handleClear}>
          Clear
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {childKeys.length > 0 && (
        <div className="keys-section">
          <div className="keys-header">
            <h3 className="keys-title">Child Keys of "{path}":</h3>
            <div className="keys-count">{childKeys.length} key{childKeys.length !== 1 ? 's' : ''} found</div>
          </div>
          <div className="keys-list">
            {childKeys.map((item, index) => (
              <div key={index} className="key-item">
                <div className="key-info">
                  <span className="key-name">{item.key}</span>
                  <span className="key-type">{item.type}</span>
                  {item.hasChildren && <span className="key-badge">has children</span>}
                </div>
                <div className="key-path">
                  <code>{item.fullPath}</code>
                  <button 
                    className="button button-small copy-key-button"
                    onClick={() => handleCopyKey(item.fullPath)}
                    title="Copy full path"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default KeyExplorer
