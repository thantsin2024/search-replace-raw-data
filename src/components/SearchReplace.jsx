import React, { useState } from 'react'
import { copyToClipboard } from '../utils/copyToClipboard'

function SearchReplace() {
  const [key, setKey] = useState('')
  const [replacementValue, setReplacementValue] = useState('')
  const [data, setData] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [comparison, setComparison] = useState(null) // { keys: [], replacements: [{key, oldValue, newValue}], newValue }

  // Function to get nested value from object using dot notation key
  const getNestedValue = (obj, path) => {
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

  // Function to replace value in JSON string while preserving format
  // Returns { result, oldValue } or null if not found
  const replaceValueInJsonString = (jsonString, keyPath, newValue) => {
    const keys = keyPath.split('.')
    let result = jsonString
    let currentIndex = 0
    
    // Navigate through the JSON string to find the key path
    for (let i = 0; i < keys.length; i++) {
      const currentKey = keys[i]
      const isLastKey = i === keys.length - 1
      
      // Find the key in the string
      const keyPattern = new RegExp(`"${currentKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`, 'g')
      let match
      let bestMatch = null
      let bestMatchIndex = -1
      
      // Find all matches and select the one at the correct nesting level
      while ((match = keyPattern.exec(result)) !== null) {
        const matchIndex = match.index
        if (matchIndex >= currentIndex) {
          bestMatch = match
          bestMatchIndex = matchIndex
          break
        }
      }
      
      if (!bestMatch) {
        return { result: null, oldValue: null } // Key not found
      }
      
      // Find the value after the colon
      let valueStart = bestMatch.index + bestMatch[0].length
      // Skip whitespace
      while (valueStart < result.length && /\s/.test(result[valueStart])) {
        valueStart++
      }
      
      if (isLastKey) {
        // This is the final key, replace its value
        let valueEnd = valueStart
        let inString = false
        let escapeNext = false
        let braceCount = 0
        let bracketCount = 0
        
        // Determine the end of the value
        for (let j = valueStart; j < result.length; j++) {
          const char = result[j]
          
          if (escapeNext) {
            escapeNext = false
            continue
          }
          
          if (char === '\\') {
            escapeNext = true
            continue
          }
          
          if (char === '"' && !escapeNext) {
            inString = !inString
            if (!inString && braceCount === 0 && bracketCount === 0) {
              valueEnd = j + 1
              break
            }
            continue
          }
          
          if (!inString) {
            if (char === '{') braceCount++
            if (char === '}') braceCount--
            if (char === '[') bracketCount++
            if (char === ']') {
              bracketCount--
              // If this closes an array and we're back to 0, include the closing bracket
              if (bracketCount === 0 && braceCount === 0) {
                valueEnd = j + 1
                break
              }
            }
            
            if ((char === ',' || char === '}') && braceCount === 0 && bracketCount === 0) {
              valueEnd = j
              break
            }
          }
          
          // Handle non-string values (numbers, booleans, null)
          if (!inString && braceCount === 0 && bracketCount === 0) {
            if (/[,\}]/.test(char)) {
              valueEnd = j
              break
            }
          }
        }
        
        // Extract the original value to determine its type
        const originalValue = result.substring(valueStart, valueEnd).trim()
        const oldValue = originalValue // Store old value for comparison
        let replacement = newValue
        
        // Check if original value is an array
        if (originalValue.startsWith('[')) {
          // It's an array - try to parse replacement value as JSON array
          try {
            // Try to parse as JSON array first
            const parsedArray = JSON.parse(newValue)
            if (Array.isArray(parsedArray)) {
              // Format as JSON array
              replacement = JSON.stringify(parsedArray)
            } else {
              // If not an array, treat as comma-separated string and convert to array
              const items = newValue.split(',').map(item => item.trim()).filter(item => item)
              replacement = JSON.stringify(items)
            }
          } catch (e) {
            // If parsing fails, try different formats
            // Check if it's already a JSON-like array string (but not valid JSON)
            if (newValue.trim().startsWith('[') && newValue.trim().endsWith(']')) {
              // It looks like an array but might have syntax issues, try to fix it
              replacement = newValue.trim()
            } else {
              // Treat as comma-separated values and create array
              const items = newValue.split(',').map(item => {
                const trimmed = item.trim()
                // Remove quotes if present
                if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
                    (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
                  return trimmed.slice(1, -1)
                }
                return trimmed
              }).filter(item => item)
              replacement = JSON.stringify(items)
            }
          }
        } else if (originalValue.startsWith('{')) {
          // It's an object - try to parse replacement value as JSON object
          try {
            const parsedObj = JSON.parse(newValue)
            replacement = JSON.stringify(parsedObj)
          } catch (e) {
            // If not valid JSON, wrap as string
            replacement = `"${newValue.replace(/"/g, '\\"')}"`
          }
        } else if (originalValue.startsWith('"') && originalValue.endsWith('"')) {
          // It's a string, keep quotes
          replacement = `"${newValue.replace(/"/g, '\\"')}"`
        } else if (originalValue === 'true' || originalValue === 'false' || originalValue === 'null') {
          // Keep boolean/null as is, but convert newValue appropriately
          if (newValue === 'true' || newValue === 'false' || newValue === 'null') {
            replacement = newValue
          } else {
            replacement = `"${newValue.replace(/"/g, '\\"')}"`
          }
        } else if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(originalValue)) {
          // It's a number, try to preserve as number if replacement is numeric
          if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(newValue)) {
            replacement = newValue
          } else {
            replacement = `"${newValue.replace(/"/g, '\\"')}"`
          }
        }
        
        // Replace the value
        result = result.substring(0, valueStart) + replacement + result.substring(valueEnd)
        return { result, oldValue, newValue: replacement }
      } else {
        // Move to the nested object
        if (result[valueStart] === '{') {
          currentIndex = valueStart + 1
        } else {
          return { result: null, oldValue: null } // Expected an object
        }
      }
    }
    
    return { result: result, oldValue: null }
  }

  // Function to replace value in data
  const handleReplace = () => {
    setError('')
    setResult('')
    setComparison(null)

    if (!key.trim()) {
      setError('Please enter a key')
      return
    }

    if (!data.trim()) {
      setError('Please enter data to process')
      return
    }

    // Parse comma-separated keys
    const keys = key.split(',').map(k => k.trim()).filter(k => k.length > 0)
    
    if (keys.length === 0) {
      setError('Please enter at least one valid key')
      return
    }

    try {
      // Try to parse as JSON first
      let parsedData
      try {
        parsedData = JSON.parse(data)
      } catch (e) {
        // If not JSON, treat as plain text or .env format
        // For .env format, replace key=value pairs
        if (data.includes('=')) {
          const lines = data.split('\n')
          const replacements = []
          let updatedData = data
          
          keys.forEach(keyToReplace => {
            const updatedLines = updatedData.split('\n')
            const newLines = updatedLines.map(line => {
              const trimmedLine = line.trim()
              if (trimmedLine.startsWith(keyToReplace + '=') || trimmedLine.startsWith(keyToReplace + ' =')) {
                const match = trimmedLine.match(/^[^=]*=\s*(.*)$/)
                if (match) {
                  replacements.push({
                    key: keyToReplace,
                    oldValue: match[1],
                    newValue: replacementValue
                  })
                }
                return `${keyToReplace}=${replacementValue}`
              }
              return line
            })
            updatedData = newLines.join('\n')
          })
          
          if (replacements.length > 0) {
            setComparison({
              keys: keys,
              replacements: replacements,
              newValue: replacementValue
            })
          } else {
            setError(`None of the keys "${keys.join(', ')}" were found in the data`)
            return
          }
          setResult(updatedData)
          return
        } else {
          // Plain text replacement - find occurrences for all keys
          const replacements = []
          let updatedData = data
          let totalOccurrences = 0
          
          keys.forEach(keyToReplace => {
            const regex = new RegExp(`(${keyToReplace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g')
            const matches = [...updatedData.matchAll(regex)]
            if (matches.length > 0) {
              replacements.push({
                key: keyToReplace,
                oldValue: keyToReplace,
                newValue: replacementValue,
                occurrences: matches.length
              })
              totalOccurrences += matches.length
              updatedData = updatedData.replace(regex, replacementValue)
            }
          })
          
          if (replacements.length > 0) {
            setComparison({
              keys: keys,
              replacements: replacements,
              newValue: replacementValue,
              totalOccurrences: totalOccurrences
            })
            setResult(updatedData)
          } else {
            setError(`None of the keys "${keys.join(', ')}" were found in the data`)
          }
          return
        }
      }

      // Handle JSON data
      if (typeof parsedData === 'object' && parsedData !== null) {
        const replacements = []
        let updatedData = data
        let foundAny = false
        
        // Process each key
        for (const keyToReplace of keys) {
          // Check if key exists in the data
          const existingValue = getNestedValue(parsedData, keyToReplace)
          
          if (existingValue !== undefined) {
            foundAny = true
            // Replace the value in the current data string
            const replaced = replaceValueInJsonString(updatedData, keyToReplace, replacementValue)
            if (replaced && replaced.result !== null) {
              updatedData = replaced.result
              // Format the old value for display
              let displayOldValue = replaced.oldValue
              try {
                // Try to parse and stringify to format nicely
                const parsedOld = JSON.parse(replaced.oldValue)
                displayOldValue = JSON.stringify(parsedOld, null, 2)
              } catch (e) {
                // Keep as is if not valid JSON
              }
              replacements.push({
                key: keyToReplace,
                oldValue: displayOldValue,
                newValue: replaced.newValue,
                oldValueRaw: replaced.oldValue
              })
              // Re-parse the updated data for next iteration
              try {
                parsedData = JSON.parse(updatedData)
              } catch (e) {
                // If parsing fails, continue with current data
              }
            }
          }
        }
        
        if (foundAny && replacements.length > 0) {
          setResult(updatedData)
          setComparison({
            keys: keys,
            replacements: replacements,
            newValue: replacementValue
          })
        } else {
          const notFoundKeys = keys.filter(k => getNestedValue(parsedData, k) === undefined)
          if (notFoundKeys.length === keys.length) {
            setError(`None of the keys "${keys.join(', ')}" were found in the data`)
          } else {
            setError(`Some keys were not found: ${notFoundKeys.join(', ')}`)
          }
        }
      } else {
        setError('Parsed data is not an object')
      }
    } catch (err) {
      setError(`Error processing data: ${err.message}`)
    }
  }

  const handleCopy = async () => {
    if (result) {
      const success = await copyToClipboard(result)
      if (success) {
        alert('Copied to clipboard!')
      } else {
        alert('Failed to copy. Please try selecting and copying manually.')
      }
    }
  }

  const handleClear = () => {
    setKey('')
    setReplacementValue('')
    setData('')
    setResult('')
    setError('')
    setComparison(null)
  }

  return (
    <>
        <div className="form-group">
          <label htmlFor="key">Key(s) - Comma-separated for multiple keys (use dot notation for nested keys, e.g., "user.name"):</label>
          <input
            id="key"
            type="text"
            className="input"
            placeholder="e.g., user.name, apiKey, config.url or single key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="replacement">Replacement Value:</label>
          <input
            id="replacement"
            type="text"
            className="input"
            placeholder="Enter new value"
            value={replacementValue}
            onChange={(e) => setReplacementValue(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="data">Data (JSON, .env, or plain text):</label>
          <textarea
            id="data"
            className="textarea"
            placeholder='Paste your data here (e.g., {"user": {"name": "John"}} or API_KEY=old_value)'
            value={data}
            onChange={(e) => setData(e.target.value)}
            rows="10"
          />
        </div>

        <div className="button-group">
          <button className="button button-primary" onClick={handleReplace}>
            Replace
          </button>
          <button className="button button-secondary" onClick={handleClear}>
            Clear All
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {comparison && (
          <div className="comparison-section">
            <h3 className="comparison-title">
              Found & Replaced {comparison.replacements.length > 1 ? `(${comparison.replacements.length} keys)` : ''}
            </h3>
            <div className="comparison-content">
              <div className="comparison-item">
                <label className="comparison-label">Keys:</label>
                <div className="comparison-value key-value">
                  {comparison.keys.join(', ')}
                </div>
              </div>
              
              {comparison.totalOccurrences && (
                <div className="comparison-item">
                  <label className="comparison-label">Total Occurrences:</label>
                  <div className="comparison-value">{comparison.totalOccurrences}</div>
                </div>
              )}
              
              {comparison.replacements && comparison.replacements.length > 0 && (
                <div className="comparison-item">
                  <label className="comparison-label">Replacements:</label>
                  <div className="replacements-list">
                    {comparison.replacements.map((replacement, index) => (
                      <div key={index} className="replacement-item">
                        <div className="replacement-key">
                          <strong>Key: {replacement.key}</strong>
                          {replacement.occurrences && (
                            <span className="occurrence-badge">({replacement.occurrences} times)</span>
                          )}
                        </div>
                        <div className="replacement-values">
                          <div className="replacement-old">
                            <span className="replacement-label">Old:</span>
                            <div className="comparison-value old-value small">
                              <pre>{replacement.oldValue}</pre>
                            </div>
                          </div>
                          <div className="replacement-new">
                            <span className="replacement-label">New:</span>
                            <div className="comparison-value new-value small">
                              <pre>{replacement.newValue}</pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {comparison.replacements && comparison.replacements.length === 1 && (
                <>
                  <div className="comparison-item">
                    <label className="comparison-label">Old Value:</label>
                    <div className="comparison-value old-value">
                      <pre>{comparison.replacements[0].oldValue}</pre>
                    </div>
                  </div>
                  <div className="comparison-item">
                    <label className="comparison-label">New Value:</label>
                    <div className="comparison-value new-value">
                      <pre>{comparison.replacements[0].newValue}</pre>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className="result-section">
            <div className="result-header">
              <label>Result:</label>
              <button className="button button-small" onClick={handleCopy}>
                Copy
              </button>
            </div>
            <textarea
              className="textarea result-textarea"
              value={result}
              readOnly
              rows="10"
            />
          </div>
        )}
    </>
  )
}

export default SearchReplace
