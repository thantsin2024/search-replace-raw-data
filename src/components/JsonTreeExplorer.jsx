import React, { useState, useRef } from 'react'
import { copyToClipboard } from '../utils/copyToClipboard'

function JsonTreeExplorer() {
  const [jsonData, setJsonData] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [error, setError] = useState('')
  const [treeNodes, setTreeNodes] = useState([])
  const [checkedKeys, setCheckedKeys] = useState(new Set())
  const [showSelectedKeys, setShowSelectedKeys] = useState(false)
  const [replacementValue, setReplacementValue] = useState('')
  const [updatedJsonData, setUpdatedJsonData] = useState(null)
  const [isUpdatedJsonValid, setIsUpdatedJsonValid] = useState(true)
  const [toast, setToast] = useState(null)
  const fileInputRef = useRef(null)
  const toastTimeoutRef = useRef(null)

  // Show toast notification
  const showToast = (message, type = 'success') => {
    // Clear existing toast timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    
    setToast({ message, type })
    
    // Auto-dismiss after 3 seconds
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  // Structure to represent a tree node
  const createTreeNode = (key, path, children = []) => ({
    key,
    path,
    children,
    checked: false
  })

  // Recursively extract all keys from JSON object
  const extractKeys = (obj, parentPath = '', isRoot = false) => {
    const nodes = []

    if (obj === null || obj === undefined) {
      return nodes
    }

    // Handle root-level arrays
    if (isRoot && Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          const arrayPath = `[${index}]`
          const childNodes = extractKeys(item, arrayPath, false)
          // Create a node for the array index
          const indexNode = createTreeNode(`[${index}]`, arrayPath)
          indexNode.children = childNodes
          nodes.push(indexNode)
        }
      })
      return nodes
    }

    // Handle arrays (non-root)
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          const arrayPath = parentPath ? `${parentPath}[${index}]` : `[${index}]`
          const childNodes = extractKeys(item, arrayPath, false)
          nodes.push(...childNodes)
        }
      })
      return nodes
    }

    // Handle objects
    if (typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const currentPath = parentPath ? `${parentPath}.${key}` : key
        const value = obj[key]
        
        const node = createTreeNode(key, currentPath)
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Object - has children
          node.children = extractKeys(value, currentPath, false)
        } else if (Array.isArray(value)) {
          // Array - process array items
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              const arrayPath = `${currentPath}[${index}]`
              const childNodes = extractKeys(item, arrayPath, false)
              // Create a node for the array index
              const indexNode = createTreeNode(`[${index}]`, arrayPath)
              indexNode.children = childNodes
              node.children.push(indexNode)
            }
          })
        }
        
        nodes.push(node)
      })
    }

    return nodes
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target.result
      setJsonData(content)
      processJsonData(content)
    }
    reader.onerror = () => {
      setError('Failed to read file')
    }
    reader.readAsText(file)
  }

  const handleJsonInput = (value) => {
    setJsonData(value)
    // Only reset updated JSON if user is manually editing (not from our own updates)
    if (value !== updatedJsonData) {
      setUpdatedJsonData(null)
      setIsUpdatedJsonValid(true)
    }
    if (value.trim()) {
      processJsonData(value)
    } else {
      setParsedData(null)
      setTreeNodes([])
      setError('')
    }
  }

  const processJsonData = (data, preserveUpdatedJson = false) => {
    setError('')
    try {
      const parsed = JSON.parse(data)
      setParsedData(parsed)
      
      // Extract keys and build tree (pass true for isRoot)
      const nodes = extractKeys(parsed, '', true)
      setTreeNodes(nodes)
      setCheckedKeys(new Set())
      if (!preserveUpdatedJson) {
        setUpdatedJsonData(null) // Reset updated JSON when processing new data
        setIsUpdatedJsonValid(true) // Reset validation state
      }
    } catch (err) {
      setError(`Invalid JSON: ${err.message}`)
      setParsedData(null)
      setTreeNodes([])
      if (!preserveUpdatedJson) {
        setUpdatedJsonData(null)
        setIsUpdatedJsonValid(false)
      }
    }
  }

  // Recursively collect all child paths from a node
  const getAllChildPaths = (node) => {
    const paths = [node.path]
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        paths.push(...getAllChildPaths(child))
      })
    }
    return paths
  }

  // Find node by path in the tree
  const findNodeByPath = (nodes, targetPath) => {
    for (const node of nodes) {
      if (node.path === targetPath) {
        return node
      }
      if (node.children && node.children.length > 0) {
        const found = findNodeByPath(node.children, targetPath)
        if (found) return found
      }
    }
    return null
  }

  const handleCheckboxChange = (path, checked) => {
    const newCheckedKeys = new Set(checkedKeys)
    const node = findNodeByPath(treeNodes, path)
    
    if (checked) {
      // Add parent and all children
      newCheckedKeys.add(path)
      if (node && node.children && node.children.length > 0) {
        const childPaths = getAllChildPaths(node)
        childPaths.forEach(childPath => {
          newCheckedKeys.add(childPath)
        })
      }
    } else {
      // Remove parent and all children
      newCheckedKeys.delete(path)
      if (node && node.children && node.children.length > 0) {
        const childPaths = getAllChildPaths(node)
        childPaths.forEach(childPath => {
          newCheckedKeys.delete(childPath)
        })
      }
    }
    setCheckedKeys(newCheckedKeys)
  }

  const handleShowSelectedKeys = () => {
    setShowSelectedKeys(!showSelectedKeys)
  }

  const handleCopySelectedKeysTree = async () => {
    const treeText = formatSelectedKeysAsTree()
    const success = await copyToClipboard(treeText)
    if (success) {
      showToast('Selected Keys Tree copied to clipboard!', 'success')
    } else {
      showToast('Failed to copy. Please try again.', 'error')
    }
  }

  const formatSelectedKeysAsTree = () => {
    if (checkedKeys.size === 0) {
      return 'No keys selected'
    }

    const sortedPaths = Array.from(checkedKeys).sort()
    
    // Build a tree structure from paths
    const buildTree = (paths) => {
      const root = { children: {}, paths: [] }
      
      paths.forEach(path => {
        // Parse path into segments
        const segments = []
        let current = ''
        let i = 0
        
        while (i < path.length) {
          if (path[i] === '[') {
            if (current) {
              segments.push(current)
              current = ''
            }
            i++
            let arrayIndex = ''
            while (i < path.length && path[i] !== ']') {
              arrayIndex += path[i]
              i++
            }
            if (arrayIndex) {
              segments.push(`[${arrayIndex}]`)
            }
            i++
          } else if (path[i] === '.') {
            if (current) {
              segments.push(current)
              current = ''
            }
            i++
          } else {
            current += path[i]
            i++
          }
        }
        
        if (current) {
          segments.push(current)
        }
        
        // Build tree structure
        let currentLevel = root
        segments.forEach((segment, index) => {
          const isLast = index === segments.length - 1
          
          if (!currentLevel.children[segment]) {
            currentLevel.children[segment] = { children: {}, paths: [] }
          }
          
          if (isLast) {
            currentLevel.children[segment].paths.push(path)
          } else {
            currentLevel = currentLevel.children[segment]
          }
        })
      })
      
      return root
    }
    
    const tree = buildTree(sortedPaths)
    
    // Render tree with proper indentation
    const renderTree = (node, prefix = '', isLast = true) => {
      const lines = []
      const childrenKeys = Object.keys(node.children).sort()
      
      childrenKeys.forEach((key, index) => {
        const isLastKey = index === childrenKeys.length - 1
        const currentNode = node.children[key]
        const connector = prefix === '' ? '' : (isLast ? '└─ ' : '├─ ')
        const currentLine = prefix + connector + key
        const nextPrefix = prefix + (isLast ? '   ' : '│  ')
        
        // Display the key with its paths if any
        if (currentNode.paths.length > 0) {
          currentNode.paths.forEach((path, pathIndex) => {
            if (pathIndex === 0) {
              lines.push(`${currentLine} → ${path}`)
            } else {
              lines.push(`${prefix}   ${key} → ${path}`)
            }
          })
        } else {
          lines.push(currentLine)
        }
        
        // Render children
        if (Object.keys(currentNode.children).length > 0) {
          const childLines = renderTree(currentNode, nextPrefix, isLastKey)
          lines.push(...childLines)
        }
      })
      
      return lines
    }
    
    const result = renderTree(tree)
    return result.length > 0 ? result.join('\n') : sortedPaths.join('\n')
  }

  const renderTreeNode = (node, level = 0) => {
    const isChecked = checkedKeys.has(node.path)
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.path} className="json-tree-node" style={{ marginLeft: `${level * 20}px` }}>
        <div className="json-tree-item">
          <label className="json-tree-label">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => handleCheckboxChange(node.path, e.target.checked)}
              className="json-tree-checkbox"
            />
            <span className="json-tree-key">{node.key}</span>
            <span className="json-tree-path">({node.path})</span>
          </label>
        </div>
        {hasChildren && (
          <div className="json-tree-children">
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  // Get only innermost/leaf keys (keys that have no children in the checked set)
  const getInnermostKeys = () => {
    const allCheckedPaths = Array.from(checkedKeys)
    const innermostKeys = []
    
    allCheckedPaths.forEach(path => {
      const node = findNodeByPath(treeNodes, path)
      // Check if this path has any checked children
      const hasCheckedChildren = node && node.children && node.children.length > 0
        ? node.children.some(child => checkedKeys.has(child.path))
        : false
      
      // If no checked children, it's an innermost key
      if (!hasCheckedChildren) {
        innermostKeys.push(path)
      }
    })
    
    return innermostKeys
  }

  // Set value in nested object using path
  const setNestedValue = (obj, path, value) => {
    try {
      // Parse path into segments (handling both dot notation and array indices)
      const segments = []
      let current = ''
      let i = 0
      
      while (i < path.length) {
        if (path[i] === '[') {
          if (current) {
            segments.push({ type: 'key', value: current })
            current = ''
          }
          i++
          let arrayIndex = ''
          while (i < path.length && path[i] !== ']') {
            arrayIndex += path[i]
            i++
          }
          if (arrayIndex) {
            segments.push({ type: 'index', value: parseInt(arrayIndex) })
          }
          i++
        } else if (path[i] === '.') {
          if (current) {
            segments.push({ type: 'key', value: current })
            current = ''
          }
          i++
        } else {
          current += path[i]
          i++
        }
      }
      
      if (current) {
        segments.push({ type: 'key', value: current })
      }
      
      if (segments.length === 0) {
        return false
      }
      
      // Navigate to the parent of the target
      let currentObj = obj
      for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i]
        
        if (segment.type === 'index') {
          if (!Array.isArray(currentObj) || segment.value >= currentObj.length) {
            return false
          }
          currentObj = currentObj[segment.value]
        } else {
          if (!currentObj || typeof currentObj !== 'object' || Array.isArray(currentObj)) {
            return false
          }
          currentObj = currentObj[segment.value]
        }
        
        if (currentObj === undefined || currentObj === null) {
          return false
        }
      }
      
      // Set the value
      const lastSegment = segments[segments.length - 1]
      if (lastSegment.type === 'index') {
        if (!Array.isArray(currentObj) || lastSegment.value >= currentObj.length) {
          return false
        }
        currentObj[lastSegment.value] = value
      } else {
        if (!currentObj || typeof currentObj !== 'object' || Array.isArray(currentObj)) {
          return false
        }
        currentObj[lastSegment.value] = value
      }
      
      return true
    } catch (err) {
      console.error('Error setting nested value:', err)
      return false
    }
  }

  // Replace value in JSON string while preserving format (similar to SearchReplace component)
  const replaceValueInJsonString = (jsonString, keyPath, newValue) => {
    // Parse path into segments
    const segments = []
    let current = ''
    let i = 0
    
    while (i < keyPath.length) {
      if (keyPath[i] === '[') {
        if (current) {
          segments.push({ type: 'key', value: current })
          current = ''
        }
        i++
        let arrayIndex = ''
        while (i < keyPath.length && keyPath[i] !== ']') {
          arrayIndex += keyPath[i]
          i++
        }
        if (arrayIndex) {
          segments.push({ type: 'index', value: parseInt(arrayIndex) })
        }
        i++
      } else if (keyPath[i] === '.') {
        if (current) {
          segments.push({ type: 'key', value: current })
          current = ''
        }
        i++
      } else {
        current += keyPath[i]
        i++
      }
    }
    
    if (current) {
      segments.push({ type: 'key', value: current })
    }
    
    if (segments.length === 0) {
      return { result: null, success: false }
    }
    
    let result = jsonString
    let currentIndex = 0
    
    // Navigate through the JSON string to find the key path
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const isLastSegment = i === segments.length - 1
      
      if (segment.type === 'index') {
        // Handle array index
        const bracketPattern = /\[(\d+)\]/g
        let match
        let bestMatch = null
        
        while ((match = bracketPattern.exec(result)) !== null) {
          const matchIndex = match.index
          if (matchIndex >= currentIndex && parseInt(match[1]) === segment.value) {
            bestMatch = match
            break
          }
        }
        
        if (!bestMatch) {
          return { result: null, success: false }
        }
        
        if (isLastSegment) {
          // Find value after the bracket
          let valueStart = bestMatch.index + bestMatch[0].length
          while (valueStart < result.length && /\s/.test(result[valueStart])) {
            valueStart++
          }
          
          // Find end of value
          const valueEnd = findValueEnd(result, valueStart)
          if (valueEnd === -1) return { result: null, success: false }
          
          const originalValue = result.substring(valueStart, valueEnd).trim()
          const replacement = formatReplacementValue(originalValue, newValue)
          
          result = result.substring(0, valueStart) + replacement + result.substring(valueEnd)
          return { result, success: true }
        } else {
          // Move past the bracket to find the next segment
          currentIndex = bestMatch.index + bestMatch[0].length
          // Skip whitespace and find the opening brace/bracket
          while (currentIndex < result.length && /\s/.test(result[currentIndex])) {
            currentIndex++
          }
          if (result[currentIndex] === '{' || result[currentIndex] === '[') {
            currentIndex++
          }
        }
      } else {
        // Handle object key
        const keyPattern = new RegExp(`"${segment.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`, 'g')
        let match
        let bestMatch = null
        
        while ((match = keyPattern.exec(result)) !== null) {
          const matchIndex = match.index
          if (matchIndex >= currentIndex) {
            bestMatch = match
            break
          }
        }
        
        if (!bestMatch) {
          return { result: null, success: false }
        }
        
        // Find the value after the colon
        let valueStart = bestMatch.index + bestMatch[0].length
        while (valueStart < result.length && /\s/.test(result[valueStart])) {
          valueStart++
        }
        
        if (isLastSegment) {
          // This is the final key, replace its value
          const valueEnd = findValueEnd(result, valueStart)
          if (valueEnd === -1) return { result: null, success: false }
          
          const originalValue = result.substring(valueStart, valueEnd).trim()
          const replacement = formatReplacementValue(originalValue, newValue)
          
          result = result.substring(0, valueStart) + replacement + result.substring(valueEnd)
          return { result, success: true }
        } else {
          // Move to the nested object
          if (result[valueStart] === '{' || result[valueStart] === '[') {
            currentIndex = valueStart + 1
          } else {
            return { result: null, success: false }
          }
        }
      }
    }
    
    return { result: null, success: false }
  }

  // Helper function to find the end of a JSON value
  const findValueEnd = (str, start) => {
    let valueEnd = start
    let inString = false
    let escapeNext = false
    let braceCount = 0
    let bracketCount = 0
    
    for (let j = start; j < str.length; j++) {
      const char = str[j]
      
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
          return j + 1
        }
        continue
      }
      
      if (!inString) {
        if (char === '{') braceCount++
        if (char === '}') braceCount--
        if (char === '[') bracketCount++
        if (char === ']') {
          bracketCount--
          if (bracketCount === 0 && braceCount === 0) {
            return j + 1
          }
        }
        
        if ((char === ',' || char === '}') && braceCount === 0 && bracketCount === 0) {
          return j
        }
      }
      
      if (!inString && braceCount === 0 && bracketCount === 0) {
        if (/[,\}\]]/.test(char)) {
          return j
        }
      }
    }
    
    return str.length
  }

  // Helper function to format replacement value based on original value type
  const formatReplacementValue = (originalValue, newValue) => {
    if (originalValue.startsWith('[')) {
      try {
        const parsedArray = JSON.parse(newValue)
        if (Array.isArray(parsedArray)) {
          return JSON.stringify(parsedArray)
        }
      } catch (e) {
        // Fall through
      }
      return JSON.stringify(newValue)
    } else if (originalValue.startsWith('{')) {
      try {
        JSON.parse(newValue)
        return newValue
      } catch (e) {
        return JSON.stringify(newValue)
      }
    } else if (originalValue.startsWith('"') && originalValue.endsWith('"')) {
      return JSON.stringify(newValue)
    } else if (originalValue === 'true' || originalValue === 'false' || originalValue === 'null') {
      if (newValue === 'true' || newValue === 'false' || newValue === 'null') {
        return newValue
      }
      return JSON.stringify(newValue)
    } else if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(originalValue)) {
      if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(newValue)) {
        return newValue
      }
      return JSON.stringify(newValue)
    } else {
      return JSON.stringify(newValue)
    }
  }

  // Apply replacement value to selected innermost keys
  const handleApplyValue = () => {
    if (!parsedData || !jsonData) {
      setError('No JSON data to update')
      return
    }
    
    if (checkedKeys.size === 0) {
      setError('Please select at least one key')
      return
    }
    
    if (!replacementValue.trim()) {
      setError('Please enter a replacement value')
      return
    }
    
    try {
      // Get only innermost keys
      const innermostKeys = getInnermostKeys()
      
      if (innermostKeys.length === 0) {
        setError('No innermost keys selected. Please select leaf keys (keys without children).')
        return
      }
      
      // Try to parse the replacement value as JSON, otherwise use as string
      let parsedValue
      try {
        parsedValue = JSON.parse(replacementValue)
        // If it's an object or array, stringify it for replacement
        if (typeof parsedValue === 'object') {
          parsedValue = JSON.stringify(parsedValue)
        } else {
          parsedValue = replacementValue
        }
      } catch (e) {
        // If not valid JSON, use as string
        parsedValue = replacementValue
      }
      
      // Replace values directly in the JSON string (preserving format)
      let updatedJsonString = jsonData
      let successCount = 0
      
      innermostKeys.forEach(path => {
        const replaced = replaceValueInJsonString(updatedJsonString, path, parsedValue)
        if (replaced && replaced.success && replaced.result) {
          updatedJsonString = replaced.result
          successCount++
        }
      })
      
      if (successCount === 0) {
        setError('Failed to update any keys. Please check the selected paths.')
        return
      }
      
      // Validate the updated JSON
      let isValid = true
      let validationError = ''
      try {
        JSON.parse(updatedJsonString)
      } catch (e) {
        isValid = false
        validationError = `Warning: Updated JSON is invalid - ${e.message}`
      }
      
      // Update the JSON data (preserving original format)
      setUpdatedJsonData(updatedJsonString)
      setIsUpdatedJsonValid(isValid)
      
      // Set error message if invalid, clear if valid
      if (!isValid) {
        setError(validationError)
        // Don't reprocess if invalid - keep the tree as is
        // Still update jsonData so user can see the invalid JSON
        setJsonData(updatedJsonString)
      } else {
        setError('') // Clear any previous errors
        // Update jsonData and reprocess to update tree
        setJsonData(updatedJsonString)
        // Reprocess to update tree, but preserve updatedJsonData state
        processJsonData(updatedJsonString, true)
      }
    } catch (err) {
      setError(`Error updating JSON: ${err.message}`)
      setIsUpdatedJsonValid(false)
    }
  }

  // Copy updated JSON to clipboard
  const handleCopyUpdatedJson = async () => {
    if (!updatedJsonData) {
      setError('No updated JSON data to copy')
      return
    }
    
    const success = await copyToClipboard(updatedJsonData)
    if (success) {
      showToast('Updated JSON copied to clipboard!', 'success')
    } else {
      showToast('Failed to copy. Please try again.', 'error')
    }
  }

  const handleClear = () => {
    setJsonData('')
    setParsedData(null)
    setTreeNodes([])
    setError('')
    setCheckedKeys(new Set())
    setReplacementValue('')
    setUpdatedJsonData(null)
    setIsUpdatedJsonValid(true)
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            {toast.type === 'success' && (
              <svg className="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            )}
            <span className="toast-message">{toast.message}</span>
          </div>
          <button 
            className="toast-close"
            onClick={() => {
              if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current)
              }
              setToast(null)
            }}
            aria-label="Close toast"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="json-file">Upload JSON File:</label>
        <input
          id="json-file"
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileUpload}
          className="file-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="json-tree-input">Or Paste JSON Data:</label>
        <textarea
          id="json-tree-input"
          className="textarea"
          placeholder='Paste your JSON data here (e.g., {"user": {"name": "John", "email": "john@example.com"}})'
          value={jsonData}
          onChange={(e) => handleJsonInput(e.target.value)}
          rows="10"
        />
      </div>

      <div className="form-group">
        <label htmlFor="replacement-value">Replacement Value (for selected innermost keys):</label>
        <input
          id="replacement-value"
          type="text"
          className="input"
          placeholder='Enter value (e.g., "new value" or 123 or {"nested": "object"})'
          value={replacementValue}
          onChange={(e) => setReplacementValue(e.target.value)}
        />
        <small className="form-hint">
          Value will be applied only to innermost/leaf keys (keys without checked children)
        </small>
      </div>

      <div className="button-group">
        <button className="button button-secondary" onClick={handleClear}>
          Clear
        </button>
        {checkedKeys.size > 0 && (
          <>
            <button className="button button-primary" onClick={handleApplyValue}>
              Apply Value to Selected Keys
            </button>
            <button className="button button-primary" onClick={handleShowSelectedKeys}>
              {showSelectedKeys ? 'Hide' : 'Show'} Selected Keys ({checkedKeys.size})
            </button>
          </>
        )}
        {updatedJsonData && isUpdatedJsonValid && (
          <button className="button button-primary" onClick={handleCopyUpdatedJson}>
            Copy Updated JSON
          </button>
        )}
      </div>

      {updatedJsonData && !isUpdatedJsonValid && (
        <div className="warning-message">
          ⚠️ Invalid JSON: Cannot copy. The updated JSON data is invalid. Please fix the JSON data.
        </div>
      )}

      {error && (
        <div className={`${error.includes('Warning:') ? 'warning-message' : 'error-message'}`}>
          {error}
        </div>
      )}

      {parsedData && treeNodes.length > 0 && (
        <div className="json-tree-section">
          <div className="json-tree-header">
            <h3 className="json-tree-title">JSON Keys Tree Structure</h3>
            <div className="json-tree-count">
              {treeNodes.length} key{treeNodes.length !== 1 ? 's' : ''} found
            </div>
          </div>
          <div className="json-tree-container">
            {treeNodes.map((node) => renderTreeNode(node))}
          </div>
        </div>
      )}

      {parsedData && treeNodes.length === 0 && (
        <div className="info-message">
          JSON is valid but contains no object keys (might be an array or primitive value).
        </div>
      )}

      {showSelectedKeys && checkedKeys.size > 0 && (
        <div className="selected-keys-section">
          <div className="selected-keys-header">
            <h3 className="selected-keys-title">Selected Keys Tree</h3>
            <div className="selected-keys-header-right">
              <div className="selected-keys-count">
                {checkedKeys.size} key{checkedKeys.size !== 1 ? 's' : ''} selected
              </div>
              <button
                className="button button-copy-icon"
                onClick={handleCopySelectedKeysTree}
                title="Copy Selected Keys Tree"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </div>
          <div className="selected-keys-container">
            <pre className="selected-keys-tree">
              {formatSelectedKeysAsTree()}
            </pre>
          </div>
        </div>
      )}
    </>
  )
}

export default JsonTreeExplorer
