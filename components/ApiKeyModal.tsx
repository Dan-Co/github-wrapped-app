'use client'

import { useState, useEffect } from 'react'
import styles from './ApiKeyModal.module.css'

interface ApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (apiKey: string) => void
}

export default function ApiKeyModal({ isOpen, onClose, onSave }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [isValidating, setIsValidating] = useState(false)

  useEffect(() => {
    // Load existing key if any
    const storedKey = localStorage.getItem('openai_api_key')
    if (storedKey) {
      setApiKey(storedKey)
    }
  }, [isOpen])

  const validateApiKey = async (key: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      // Use OpenAI's models endpoint to validate the key
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`,
        },
      })
      
      if (response.ok) {
        return { valid: true }
      }
      
      const data = await response.json()
      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key. Please check and try again.' }
      }
      if (response.status === 429) {
        return { valid: false, error: 'API key has exceeded rate limits or quota.' }
      }
      
      return { valid: false, error: data.error?.message || 'Failed to validate API key.' }
    } catch (err) {
      return { valid: false, error: 'Network error. Please check your connection.' }
    }
  }

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key')
      return
    }
    if (!apiKey.startsWith('sk-')) {
      setError('API key should start with "sk-"')
      return
    }
    
    // Validate the API key
    setIsValidating(true)
    setError('')
    
    const result = await validateApiKey(apiKey.trim())
    
    setIsValidating(false)
    
    if (!result.valid) {
      setError(result.error || 'Invalid API key')
      return
    }
    
    // Store in localStorage (client-side only)
    localStorage.setItem('openai_api_key', apiKey.trim())
    setError('')
    onSave(apiKey.trim())
  }

  const handleClear = () => {
    localStorage.removeItem('openai_api_key')
    setApiKey('')
    setError('')
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        
        <div className={styles.header}>
          <span className={styles.icon}>🔑</span>
          <h2 className={styles.title}>OpenAI API Key Required</h2>
        </div>
        
        <p className={styles.description}>
          To use AI-powered insights, please provide your OpenAI API key. 
          Your key is stored locally in your browser and sent directly to OpenAI.
        </p>
        
        <div className={styles.inputGroup}>
          <label className={styles.label}>API Key</label>
          <input
            type="password"
            className={styles.input}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="sk-..."
            autoFocus
          />
          {error && <p className={styles.error}>{error}</p>}
        </div>
        
        <div className={styles.info}>
          <p>💡 Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com</a></p>
          <p>🔒 Your key never leaves your browser except for OpenAI requests</p>
        </div>
        
        <div className={styles.buttons}>
          {apiKey && !isValidating && (
            <button className={styles.clearButton} onClick={handleClear}>
              Clear Saved Key
            </button>
          )}
          <button 
            className={styles.saveButton} 
            onClick={handleSave}
            disabled={isValidating}
          >
            {isValidating ? 'Validating...' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
