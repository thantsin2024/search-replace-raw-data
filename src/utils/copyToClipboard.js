// Utility function to copy text to clipboard with fallback
export const copyToClipboard = async (text) => {
  try {
    // Try modern clipboard API first (works in secure contexts)
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (err) {
    // Clipboard API failed, fall through to fallback
    console.warn('Clipboard API failed, trying fallback:', err)
  }
  
  // Fallback to execCommand for older browsers or insecure contexts
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    return successful
  } catch (err) {
    console.error('Fallback copy method failed:', err)
    return false
  }
}
