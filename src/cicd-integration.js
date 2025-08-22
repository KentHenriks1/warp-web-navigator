// cicd-integration.js
// CI/CD Integration for Warp Web Navigator

class WarpCICD {
  constructor() {
    this.config = {
      apiEndpoint: 'https://api.warp.dev/v1',
      webhookUrl: null,
      cicdProvider: 'github-actions', // github-actions, gitlab-ci, jenkins, azure-devops
      environment: 'development', // development, staging, production
      enableAutoTesting: true,
      testingSuites: ['basic', 'forms', 'interactions', 'performance'],
      reportFormats: ['json', 'junit', 'html'],
      notifications: {
        slack: null,
        teams: null,
        email: null,
      },
    }

    this.testResults = []
    this.deploymentHistory = []
    this.aiClient = null
    this.isRunning = false

    this.init()
  }

  async init() {
    await this.loadConfig()
    this.setupAIClient()
    this.registerEventListeners()
  }

  async loadConfig() {
    try {
      const result = await chrome.storage.sync.get('warpCICD')
      if (result.warpCICD) {
        this.config = { ...this.config, ...result.warpCICD }
      }
    } catch (error) {
      console.error('Failed to load CI/CD config:', error)
    }
  }

  async saveConfig() {
    try {
      await chrome.storage.sync.set({ warpCICD: this.config })
    } catch (error) {
      console.error('Failed to save CI/CD config:', error)
    }
  }

  setupAIClient() {
    this.aiClient = new WarpAIClient({
      endpoint: this.config.apiEndpoint,
      environment: this.config.environment,
    })
  }

  registerEventListeners() {
    // Listen for deployment webhooks
    if (this.config.webhookUrl) {
      this.setupWebhookListener()
    }

    // Listen for browser events that might trigger CI/CD
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && this.shouldTriggerTesting(tab.url)) {
        this.handlePageLoad(tab)
      }
    })
  }

  shouldTriggerTesting(url) {
    // Skip system pages and non-testable URLs
    if (!url || url.startsWith('chrome://') || url.startsWith('edge://')) {
      return false
    }

    // Only test configured environments
    const testPatterns = [/localhost/, /staging\./, /dev\./, /test\./]

    return (
      testPatterns.some(pattern => pattern.test(url)) || this.config.environment === 'production'
    )
  }

  async handlePageLoad(tab) {
    if (!this.config.enableAutoTesting) return

    console.log(`🚀 CI/CD: Page loaded - ${tab.url}`)

    try {
      await this.runAutomatedTestSuite(tab)
    } catch (error) {
      console.error('CI/CD automated testing failed:', error)
      await this.reportFailure(error, tab)
    }
  }

  async runAutomatedTestSuite(tab) {
    const testSession = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      tab: {
        id: tab.id,
        url: tab.url,
        title: tab.title,
      },
      environment: this.config.environment,
      testSuites: [],
      status: 'running',
    }

    console.log(`🧪 Starting automated test suite: ${testSession.sessionId}`)

    try {
      // Run configured test suites
      for (const suiteName of this.config.testingSuites) {
        const suiteResult = await this.runTestSuite(suiteName, tab)
        testSession.testSuites.push(suiteResult)
      }

      // Analyze results with AI
      const aiAnalysis = await this.analyzeResultsWithAI(testSession)
      testSession.aiAnalysis = aiAnalysis

      testSession.status = 'completed'
      testSession.endTime = Date.now()
      testSession.duration = testSession.endTime - testSession.startTime

      // Store results
      this.testResults.push(testSession)

      // Generate reports
      await this.generateCICDReports(testSession)

      // Send notifications
      await this.sendNotifications(testSession)

      console.log(`✅ Test suite completed: ${testSession.sessionId} (${testSession.duration}ms)`)
    } catch (error) {
      testSession.status = 'failed'
      testSession.error = error.message
      testSession.endTime = Date.now()

      throw error
    }

    return testSession
  }

  async runTestSuite(suiteName, tab) {
    const suiteResult = {
      name: suiteName,
      startTime: Date.now(),
      tests: [],
      status: 'running',
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'run_cicd_test_suite',
        suiteName: suiteName,
        config: this.config,
      })

      if (response && response.success) {
        suiteResult.tests = response.results
        suiteResult.status = 'completed'
        suiteResult.passed = response.results.filter(t => t.status === 'passed').length
        suiteResult.failed = response.results.filter(t => t.status === 'failed').length
        suiteResult.total = response.results.length
      } else {
        throw new Error(`Test suite ${suiteName} failed to execute`)
      }
    } catch (error) {
      suiteResult.status = 'failed'
      suiteResult.error = error.message
    }

    suiteResult.endTime = Date.now()
    suiteResult.duration = suiteResult.endTime - suiteResult.startTime

    return suiteResult
  }

  async analyzeResultsWithAI(testSession) {
    if (!this.aiClient) {
      return { analysis: 'AI analysis not available', recommendations: [] }
    }

    try {
      console.log('🤖 Analyzing test results with AI...')

      const analysis = await this.aiClient.analyzeTestResults({
        session: testSession,
        context: {
          environment: this.config.environment,
          url: testSession.tab.url,
          timestamp: testSession.startTime,
        },
      })

      return analysis
    } catch (error) {
      console.error('AI analysis failed:', error)
      return {
        analysis: `AI analysis failed: ${error.message}`,
        recommendations: ['Manual review recommended due to AI analysis failure'],
      }
    }
  }

  async generateCICDReports(testSession) {
    const reports = {}

    for (const format of this.config.reportFormats) {
      try {
        reports[format] = await this.generateReport(testSession, format)
      } catch (error) {
        console.error(`Failed to generate ${format} report:`, error)
      }
    }

    // Save reports to storage
    const reportKey = `cicd_report_${testSession.sessionId}`
    await chrome.storage.local.set({ [reportKey]: reports })

    return reports
  }

  async generateReport(testSession, format) {
    switch (format) {
      case 'json':
        return JSON.stringify(testSession, null, 2)

      case 'junit':
        return this.generateJUnitReport(testSession)

      case 'html':
        return this.generateHTMLReport(testSession)

      default:
        throw new Error(`Unsupported report format: ${format}`)
    }
  }

  generateJUnitReport(testSession) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += `<testsuites name="Warp Web Navigator CI/CD" tests="${this.getTotalTests(testSession)}" failures="${this.getTotalFailures(testSession)}" time="${testSession.duration / 1000}">\n`

    testSession.testSuites.forEach(suite => {
      xml += `  <testsuite name="${suite.name}" tests="${suite.total || 0}" failures="${suite.failed || 0}" time="${suite.duration / 1000}">\n`

      if (suite.tests) {
        suite.tests.forEach(test => {
          xml += `    <testcase name="${test.name}" classname="${suite.name}" time="${test.duration / 1000}">\n`

          if (test.status === 'failed') {
            xml += `      <failure message="${test.error || 'Test failed'}">${test.details || ''}</failure>\n`
          }

          xml += '    </testcase>\n'
        })
      }

      xml += '  </testsuite>\n'
    })

    xml += '</testsuites>'
    return xml
  }

  generateHTMLReport(testSession) {
    const totalTests = this.getTotalTests(testSession)
    const totalFailures = this.getTotalFailures(testSession)
    const successRate =
      totalTests > 0 ? (((totalTests - totalFailures) / totalTests) * 100).toFixed(1) : 0

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Warp CI/CD Test Report - ${testSession.sessionId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; color: #333; }
        .status-badge { padding: 8px 16px; border-radius: 20px; font-weight: bold; display: inline-block; }
        .status-success { background: #d4edda; color: #155724; }
        .status-failure { background: #f8d7da; color: #721c24; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { text-align: center; padding: 20px; background: #e3f2fd; border-radius: 8px; }
        .suite { margin: 20px 0; padding: 20px; border-radius: 8px; background: #fafafa; border-left: 4px solid #2196F3; }
        .test-item { margin: 10px 0; padding: 15px; border-radius: 5px; }
        .test-passed { background: #e8f5e8; border-left: 4px solid #4CAF50; }
        .test-failed { background: #ffeaea; border-left: 4px solid #f44336; }
        .ai-section { background: #f0f7ff; border: 1px solid #b3d9ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f2f2f2; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Warp CI/CD Test Report</h1>
            <h2>${testSession.tab.title}</h2>
            <p><strong>URL:</strong> ${testSession.tab.url}</p>
            <p><strong>Environment:</strong> <span class="code">${testSession.environment}</span></p>
            <p><strong>Session ID:</strong> <span class="code">${testSession.sessionId}</span></p>
            <span class="status-badge ${testSession.status === 'completed' && totalFailures === 0 ? 'status-success' : 'status-failure'}">
                ${testSession.status === 'completed' && totalFailures === 0 ? '✅ PASSED' : '❌ FAILED'}
            </span>
        </div>

        <div class="metrics">
            <div class="metric">
                <h3>${totalTests}</h3>
                <p>Total Tests</p>
            </div>
            <div class="metric">
                <h3>${totalTests - totalFailures}</h3>
                <p>Passed</p>
            </div>
            <div class="metric">
                <h3>${totalFailures}</h3>
                <p>Failed</p>
            </div>
            <div class="metric">
                <h3>${successRate}%</h3>
                <p>Success Rate</p>
            </div>
            <div class="metric">
                <h3>${testSession.duration}ms</h3>
                <p>Duration</p>
            </div>
        </div>

        ${
          testSession.aiAnalysis
            ? `
        <div class="ai-section">
            <h3>🤖 AI Analysis</h3>
            <p><strong>Analysis:</strong> ${testSession.aiAnalysis.analysis}</p>
            ${
              testSession.aiAnalysis.recommendations?.length > 0
                ? `
                <h4>Recommendations:</h4>
                <ul>
                    ${testSession.aiAnalysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            `
                : ''
            }
        </div>
        `
            : ''
        }

        <div class="suites">
            <h3>Test Suites</h3>
            ${testSession.testSuites
              .map(
                suite => `
                <div class="suite">
                    <h4>${suite.name} 
                        <span class="status-badge ${suite.status === 'completed' && suite.failed === 0 ? 'status-success' : 'status-failure'}">
                            ${suite.status === 'completed' && suite.failed === 0 ? 'PASSED' : 'FAILED'}
                        </span>
                    </h4>
                    <p><strong>Duration:</strong> ${suite.duration}ms | <strong>Tests:</strong> ${suite.total || 0} | <strong>Failed:</strong> ${suite.failed || 0}</p>
                    
                    ${
                      suite.tests?.length > 0
                        ? `
                        <div class="tests">
                            ${suite.tests
                              .map(
                                test => `
                                <div class="test-item ${test.status === 'passed' ? 'test-passed' : 'test-failed'}">
                                    <strong>${test.name}</strong> - <span class="code">${test.status}</span>
                                    ${test.duration ? `<span style="float: right;">${test.duration}ms</span>` : ''}
                                    ${test.error ? `<div style="margin-top: 10px; color: #721c24;"><strong>Error:</strong> ${test.error}</div>` : ''}
                                </div>
                            `
                              )
                              .join('')}
                        </div>
                    `
                        : ''
                    }
                </div>
            `
              )
              .join('')}
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
            <p>Generated by Warp Web Navigator CI/CD Integration</p>
            <p>Timestamp: ${new Date(testSession.startTime).toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
    `
  }

  getTotalTests(testSession) {
    return testSession.testSuites.reduce((total, suite) => total + (suite.total || 0), 0)
  }

  getTotalFailures(testSession) {
    return testSession.testSuites.reduce((total, suite) => total + (suite.failed || 0), 0)
  }

  async sendNotifications(testSession) {
    const totalFailures = this.getTotalFailures(testSession)
    const status = testSession.status === 'completed' && totalFailures === 0 ? 'success' : 'failure'

    // Slack notification
    if (this.config.notifications.slack) {
      await this.sendSlackNotification(testSession, status)
    }

    // Teams notification
    if (this.config.notifications.teams) {
      await this.sendTeamsNotification(testSession, status)
    }

    // Email notification
    if (this.config.notifications.email) {
      await this.sendEmailNotification(testSession, status)
    }
  }

  async sendSlackNotification(testSession, status) {
    try {
      const payload = {
        text: `Warp CI/CD Test ${status === 'success' ? '✅ PASSED' : '❌ FAILED'}`,
        attachments: [
          {
            color: status === 'success' ? 'good' : 'danger',
            fields: [
              { title: 'Environment', value: testSession.environment, short: true },
              { title: 'URL', value: testSession.tab.url, short: true },
              { title: 'Duration', value: `${testSession.duration}ms`, short: true },
              {
                title: 'Tests',
                value: `${this.getTotalTests(testSession)} (${this.getTotalFailures(testSession)} failed)`,
                short: true,
              },
            ],
          },
        ],
      }

      await fetch(this.config.notifications.slack, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (error) {
      console.error('Failed to send Slack notification:', error)
    }
  }

  async sendTeamsNotification(testSession, status) {
    try {
      const payload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        summary: `Warp CI/CD Test ${status}`,
        themeColor: status === 'success' ? '00FF00' : 'FF0000',
        sections: [
          {
            activityTitle: `Warp CI/CD Test ${status === 'success' ? '✅ PASSED' : '❌ FAILED'}`,
            facts: [
              { name: 'Environment', value: testSession.environment },
              { name: 'URL', value: testSession.tab.url },
              { name: 'Duration', value: `${testSession.duration}ms` },
              {
                name: 'Tests',
                value: `${this.getTotalTests(testSession)} (${this.getTotalFailures(testSession)} failed)`,
              },
            ],
          },
        ],
      }

      await fetch(this.config.notifications.teams, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (error) {
      console.error('Failed to send Teams notification:', error)
    }
  }

  async sendEmailNotification(testSession, status) {
    // This would typically integrate with an email service like SendGrid
    console.log(`📧 Email notification would be sent to: ${this.config.notifications.email}`)
  }

  async reportFailure(error, tab) {
    const failureReport = {
      timestamp: Date.now(),
      error: error.message,
      stack: error.stack,
      tab: {
        url: tab.url,
        title: tab.title,
      },
      environment: this.config.environment,
    }

    // Store failure report
    const reportKey = `cicd_failure_${Date.now()}`
    await chrome.storage.local.set({ [reportKey]: failureReport })

    // Send failure notifications
    await this.sendFailureNotifications(failureReport)
  }

  async sendFailureNotifications(failureReport) {
    // Send critical failure notifications to all configured channels
    if (this.config.notifications.slack) {
      await this.sendSlackFailure(failureReport)
    }
  }

  async sendSlackFailure(failureReport) {
    try {
      const payload = {
        text: '🚨 WARP CI/CD CRITICAL FAILURE',
        attachments: [
          {
            color: 'danger',
            fields: [
              { title: 'Error', value: failureReport.error, short: false },
              { title: 'URL', value: failureReport.tab.url, short: true },
              { title: 'Environment', value: failureReport.environment, short: true },
            ],
          },
        ],
      }

      await fetch(this.config.notifications.slack, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (error) {
      console.error('Failed to send Slack failure notification:', error)
    }
  }

  generateSessionId() {
    return 'warp-cicd-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
  }

  // Configuration methods
  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
    await this.saveConfig()

    // Reinitialize if needed
    if (newConfig.apiEndpoint) {
      this.setupAIClient()
    }
  }

  async setWebhook(webhookUrl) {
    this.config.webhookUrl = webhookUrl
    await this.saveConfig()
    this.setupWebhookListener()
  }

  async setNotifications(notifications) {
    this.config.notifications = { ...this.config.notifications, ...notifications }
    await this.saveConfig()
  }

  // Manual trigger methods
  async triggerManualTest(tab, testSuites = null) {
    const originalSuites = this.config.testingSuites

    if (testSuites) {
      this.config.testingSuites = testSuites
    }

    try {
      const result = await this.runAutomatedTestSuite(tab)
      return result
    } finally {
      if (testSuites) {
        this.config.testingSuites = originalSuites
      }
    }
  }

  // Export results for external CI/CD systems
  async exportResults(format = 'json') {
    const allResults = await this.getAllTestResults()

    switch (format) {
      case 'json':
        return JSON.stringify(allResults, null, 2)
      case 'csv':
        return this.convertToCSV(allResults)
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  async getAllTestResults() {
    const storage = await chrome.storage.local.get()
    const results = []

    Object.entries(storage).forEach(([key, value]) => {
      if (key.startsWith('cicd_report_')) {
        results.push(value)
      }
    })

    return results.sort((a, b) => b.startTime - a.startTime)
  }

  convertToCSV(results) {
    if (!results.length) return ''

    const headers = [
      'Session ID',
      'Environment',
      'URL',
      'Status',
      'Total Tests',
      'Failed Tests',
      'Duration',
      'Timestamp',
    ]
    const rows = [headers]

    results.forEach(result => {
      rows.push([
        result.sessionId,
        result.environment,
        result.tab?.url || '',
        result.status,
        this.getTotalTests(result),
        this.getTotalFailures(result),
        result.duration,
        new Date(result.startTime).toISOString(),
      ])
    })

    return rows.map(row => row.map(field => `"${field}"`).join(',')).join('\n')
  }
}

// Separate AI Client class for communication with Warp AI
class WarpAIClient {
  constructor(config) {
    this.endpoint = config.endpoint
    this.environment = config.environment
    this.apiKey = null // Would be set through configuration
  }

  async analyzeTestResults(data) {
    try {
      // Simulate AI analysis - in production this would call actual AI service
      const prompt = this.buildAnalysisPrompt(data)

      // Mock AI response for development
      if (!this.apiKey) {
        return this.generateMockAnalysis(data)
      }

      const response = await fetch(`${this.endpoint}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt,
          context: data.context,
          testResults: data.session,
        }),
      })

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('AI analysis failed:', error)
      return this.generateMockAnalysis(data)
    }
  }

  buildAnalysisPrompt(data) {
    const session = data.session
    const totalTests = session.testSuites.reduce((total, suite) => total + (suite.total || 0), 0)
    const totalFailures = session.testSuites.reduce(
      (total, suite) => total + (suite.failed || 0),
      0
    )

    return `
Analyze the following web testing session:

URL: ${session.tab.url}
Environment: ${data.context.environment}
Total Tests: ${totalTests}
Failed Tests: ${totalFailures}
Duration: ${session.duration}ms

Test Results:
${JSON.stringify(session.testSuites, null, 2)}

Please provide:
1. Overall assessment of the testing session
2. Identification of patterns in failures
3. Performance analysis
4. Specific recommendations for improvement
5. Risk assessment for deployment

Focus on actionable insights for CI/CD pipeline optimization.
`
  }

  generateMockAnalysis(data) {
    const session = data.session
    const totalFailures = session.testSuites.reduce(
      (total, suite) => total + (suite.failed || 0),
      0
    )
    const totalTests = session.testSuites.reduce((total, suite) => total + (suite.total || 0), 0)

    const recommendations = []

    if (totalFailures > 0) {
      recommendations.push('Address failing tests before deployment')
      recommendations.push('Review form validation logic')
    }

    if (session.duration > 30000) {
      recommendations.push('Optimize test execution time')
    }

    if (totalFailures === 0) {
      recommendations.push('All tests passed - safe for deployment')
    }

    return {
      analysis:
        totalFailures === 0
          ? `Excellent test results! All ${totalTests} tests passed successfully. The application appears stable and ready for deployment.`
          : `Test session completed with ${totalFailures} failures out of ${totalTests} tests. Review failed tests before proceeding with deployment.`,
      recommendations,
      riskLevel: totalFailures === 0 ? 'low' : totalFailures < totalTests * 0.1 ? 'medium' : 'high',
      deploymentRecommendation: totalFailures === 0 ? 'proceed' : 'review',
    }
  }
}

// Export for use in other modules
window.WarpCICD = WarpCICD
window.WarpAIClient = WarpAIClient
