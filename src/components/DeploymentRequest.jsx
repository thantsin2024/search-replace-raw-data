import React, { useState, useEffect } from 'react'
import { copyToClipboard } from '../utils/copyToClipboard'
import serviceList from '../service-list.json'

const PROJECT_OPTIONS = ['9bet', 'Saobet', 'Usbet', 'Topbet', 'RED', 'SKY', 'Japan', 'KUC']
const SERVICE_OPTIONS = Object.keys(serviceList)
const ENV_OPTIONS = ['Staging', 'Production']
const REQUEST_TYPE_OPTIONS = ['STG', 'PROD']

function DeploymentRequest() {
  const [requestType, setRequestType] = useState('STG')
  const [selectedProjects, setSelectedProjects] = useState([])
  const [selectedServices, setSelectedServices] = useState([])
  const [projectEnv, setProjectEnv] = useState('STG')
  const [jenkinsPipeline, setJenkinsPipeline] = useState('')
  const [repositoryLink, setRepositoryLink] = useState('')
  const [prTicket, setPrTicket] = useState('')
  const [jiraLinks, setJiraLinks] = useState('')
  const [environment, setEnvironment] = useState('Staging')
  const [deployBranch, setDeployBranch] = useState('staging')
  const [deploymentTime, setDeploymentTime] = useState('current')
  const [envVarsUpdate, setEnvVarsUpdate] = useState('')
  const [envCode, setEnvCode] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState('')

  const isProd = requestType === 'PROD'

  // Sync Project Name env, Environment, and Deploy branch with Request Type
  useEffect(() => {
    if (requestType === 'STG') {
      setProjectEnv('STG')
      setEnvironment('Staging')
      setDeployBranch('staging')
    } else {
      setProjectEnv('PROD')
      setEnvironment('Production')
      setDeployBranch('main')
    }
  }, [requestType])

  // When services/projects/env change, fill Jenkins pipeline and Repository Link from service-list
  useEffect(() => {
    if (selectedServices.length === 0) {
      setRepositoryLink('')
      setJenkinsPipeline('')
      return
    }
    const env = projectEnv
    const repos = []
    const pipelines = []
    selectedServices.forEach((serviceKey) => {
      const service = serviceList[serviceKey]
      if (!service) return
      if (service.repo) repos.push(service.repo)
      const pipeLine = service['pipe-line']
      if (pipeLine && selectedProjects.length > 0) {
        selectedProjects.forEach((project) => {
          const brandPipe = pipeLine[project]
          if (brandPipe && brandPipe[env]) {
            const url = brandPipe[env].trim()
            if (url) pipelines.push(url)
          }
        })
      }
    })
    setRepositoryLink([...new Set(repos)].join('\n'))
    setJenkinsPipeline([...new Set(pipelines)].join('\n'))
  }, [selectedServices, selectedProjects, projectEnv])

  const formatLinesWithBullet = (value) => {
    if (!value || !value.trim()) return '-'
    return value
      .split('\n')
      .map((line) => `- ${line.trimEnd()}`)
      .join('\n')
  }

  const generateDeploymentRequestText = () => {
    const lines = []
    if (isProd) {
      lines.push('⚠️ PRODUCTION DEPLOYMENT REQUEST ⚠️')
      lines.push('')
    }
    lines.push(`Project Name: ${selectedProjects.length ? selectedProjects.join(', ') : '-'} [${projectEnv}]`)
    lines.push(`Jenkins pipeline:`)
    lines.push(formatLinesWithBullet(jenkinsPipeline))
    lines.push('')
    lines.push(`Repository Link:`)
    lines.push(formatLinesWithBullet(repositoryLink))
    lines.push('')
    lines.push(`PR ticket (merged):`)
    lines.push(formatLinesWithBullet(prTicket))
    lines.push('')
    lines.push(`Jira Ticket Links:`)
    lines.push(formatLinesWithBullet(jiraLinks))
    lines.push('')
    lines.push(`Environment: ${environment}`)
    lines.push(`Deploy branch: ${deployBranch || 'staging'}`)
    lines.push(`Deployment Time: ${deploymentTime || 'current'}`)
    lines.push(`Environment Variables (.env) Update (necessary): ${envVarsUpdate || '-'}`)
    lines.push('')
    if (envCode.trim()) {
      lines.push('```')
      lines.push(envCode.trim())
      lines.push('```')
    }
    return lines.join('\n')
  }

  const handleCopy = async () => {
    const text = generateDeploymentRequestText()
    const success = await copyToClipboard(text)
    if (success) {
      setCopyFeedback('Copied!')
      setTimeout(() => setCopyFeedback(''), 2000)
    } else {
      setCopyFeedback('Failed to copy')
      setTimeout(() => setCopyFeedback(''), 2000)
    }
  }

  const handleProjectToggle = (project) => {
    setSelectedProjects((prev) =>
      prev.includes(project) ? prev.filter((p) => p !== project) : [...prev, project]
    )
  }

  const handleSelectAllProjects = (checked) => {
    if (checked) {
      setSelectedProjects([...PROJECT_OPTIONS])
    } else {
      setSelectedProjects([])
    }
  }

  const handleServiceToggle = (serviceKey) => {
    setSelectedServices((prev) =>
      prev.includes(serviceKey) ? prev.filter((s) => s !== serviceKey) : [...prev, serviceKey]
    )
  }

  const handleSelectAllServices = (checked) => {
    if (checked) {
      setSelectedServices([...SERVICE_OPTIONS])
    } else {
      setSelectedServices([])
    }
  }

  return (
    <div className="deployment-request">
      {/* Request type: STG | PROD */}
      <div className="form-group">
        <label>Request Type</label>
        <select
          className="input deploy-select"
          value={requestType}
          onChange={(e) => setRequestType(e.target.value)}
        >
          {REQUEST_TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {isProd && (
        <div className="deploy-prod-banner">
          ⚠️ PRODUCTION DEPLOYMENT REQUEST ⚠️
        </div>
      )}

      {/* Project Name: checkboxes + select */}
      <div className="form-group">
        <label>Project Name</label>
        <div className="deploy-project-row">
          <div className="deploy-checkbox-group">
            <label className="deploy-checkbox-all">
              <input
                type="checkbox"
                checked={selectedProjects.length === PROJECT_OPTIONS.length}
                onChange={(e) => handleSelectAllProjects(e.target.checked)}
              />
              <span>&nbsp;Select all</span>
            </label>
            {PROJECT_OPTIONS.map((project) => (
              <label key={project} className="deploy-checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedProjects.includes(project)}
                  onChange={() => handleProjectToggle(project)}
                />
                <span>&nbsp;{project}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Services from service-list.json */}
      <div className="form-group">
        <label>Services</label>
        <div className="deploy-checkbox-group deploy-services-group">
          <label className="deploy-checkbox-all">
            <input
              type="checkbox"
              checked={selectedServices.length === SERVICE_OPTIONS.length}
              onChange={(e) => handleSelectAllServices(e.target.checked)}
            />
            <span>&nbsp;Select all</span>
          </label>
          {SERVICE_OPTIONS.map((serviceKey) => (
            <label key={serviceKey} className="deploy-checkbox-item">
              <input
                type="checkbox"
                checked={selectedServices.includes(serviceKey)}
                onChange={() => handleServiceToggle(serviceKey)}
              />
              <span>&nbsp;{serviceKey}</span>
            </label>
          ))}
        </div>
        <small className="form-hint">
          Selected services fill Jenkins pipeline and Repository Link based on Project Name and STG/PROD.
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="jenkins-pipeline">Jenkins pipeline</label>
        <textarea
          id="jenkins-pipeline"
          className="textarea"
          placeholder="e.g. pipeline name or URL"
          value={jenkinsPipeline}
          onChange={(e) => setJenkinsPipeline(e.target.value)}
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="repo-link">Repository Link</label>
        <textarea
          id="repo-link"
          className="textarea"
          placeholder="https://..."
          value={repositoryLink}
          onChange={(e) => setRepositoryLink(e.target.value)}
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="pr-ticket">PR ticket (merged)</label>
        <textarea
          id="pr-ticket"
          className="textarea"
          placeholder="PR link or ticket number"
          value={prTicket}
          onChange={(e) => setPrTicket(e.target.value)}
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="jira-links">Jira Ticket Links</label>
        <textarea
          id="jira-links"
          className="textarea"
          placeholder="Jira ticket URLs"
          value={jiraLinks}
          onChange={(e) => setJiraLinks(e.target.value)}
          rows={3}
        />
      </div>

      <div className="deploy-row">
        <div className="form-group deploy-row-item">
          <label htmlFor="environment">Environment</label>
          <select
            id="environment"
            className="input deploy-select"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
          >
            {ENV_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group deploy-row-item">
          <label htmlFor="deploy-branch">Deploy branch</label>
          <input
            id="deploy-branch"
            type="text"
            className="input"
            placeholder="staging"
            value={deployBranch}
            onChange={(e) => setDeployBranch(e.target.value)}
          />
        </div>
        <div className="form-group deploy-row-item">
          <label htmlFor="deployment-time">Deployment Time</label>
          <input
            id="deployment-time"
            type="text"
            className="input"
            placeholder="current"
            value={deploymentTime}
            onChange={(e) => setDeploymentTime(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="env-vars-update">Environment Variables (.env) Update (necessary)</label>
        <input
          id="env-vars-update"
          type="text"
          className="input"
          placeholder="Brief description if .env update is needed"
          value={envVarsUpdate}
          onChange={(e) => setEnvVarsUpdate(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="env-code">Environment Variables / Code block</label>
        <textarea
          id="env-code"
          className="textarea deploy-code-textarea"
          placeholder="Paste .env snippet or relevant code here..."
          value={envCode}
          onChange={(e) => setEnvCode(e.target.value)}
          rows={12}
        />
      </div>

      <div className="deploy-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={() => setShowPreview((v) => !v)}
        >
          {showPreview ? 'Hide Preview' : 'Preview'}
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={handleCopy}
        >
          Copy
        </button>
        {copyFeedback && (
          <span className={`deploy-copy-feedback ${copyFeedback === 'Failed to copy' ? 'error' : ''}`}>
            {copyFeedback}
          </span>
        )}
      </div>

      {showPreview && (
        <div className="deploy-preview-section">
          <h3 className="deploy-preview-title">Preview</h3>
          <pre className="deploy-preview-content">{generateDeploymentRequestText()}</pre>
        </div>
      )}
    </div>
  )
}

export default DeploymentRequest
