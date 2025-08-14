// ai-communication.js
// Direkte AI-kommunikasjon for Warp Web Navigator

class WarpAIManager {
  constructor() {
    this.config = {
      providers: {
        openai: {
          apiKey: null,
          endpoint: 'https://api.openai.com/v1',
          model: 'gpt-4',
          enabled: false
        },
        anthropic: {
          apiKey: null,
          endpoint: 'https://api.anthropic.com/v1',
          model: 'claude-3-sonnet-20240229',
          enabled: false
        },
        warp: {
          apiKey: null,
          endpoint: 'https://api.warp.dev/v1',
          model: 'warp-ai-v1',
          enabled: true
        },
        local: {
          endpoint: 'http://localhost:11434',
          model: 'llama2',
          enabled: false
        }
      },
      defaultProvider: 'warp',
      timeout: 30000,
      retries: 3,
      maxTokens: 4000,
      temperature: 0.3,
      enableStreaming: false,
      enableCaching: true,
      cacheExpiry: 3600000 // 1 hour
    };

    this.conversationHistory = [];
    this.cache = new Map();
    this.activeRequests = new Map();
    this.eventListeners = new Map();
    
    this.init();
  }

  async init() {
    await this.loadConfig();
    this.setupEventListeners();
    this.startHeartbeat();
  }

  async loadConfig() {
    try {
      const result = await chrome.storage.sync.get('warpAI');
      if (result.warpAI) {
        this.config = { ...this.config, ...result.warpAI };
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }
  }

  async saveConfig() {
    try {
      await chrome.storage.sync.set({ warpAI: this.config });
    } catch (error) {
      console.error('Failed to save AI config:', error);
    }
  }

  setupEventListeners() {
    // Listen for AI requests from other modules
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type?.startsWith('ai_')) {
        this.handleAIRequest(message, sender, sendResponse);
        return true; // Keep message channel open for async response
      }
    });
  }

  async handleAIRequest(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'ai_analyze_page':
          const analysis = await this.analyzePage(message.data);
          sendResponse({ success: true, analysis });
          break;

        case 'ai_generate_tests':
          const tests = await this.generateTests(message.data);
          sendResponse({ success: true, tests });
          break;

        case 'ai_debug_issue':
          const solution = await this.debugIssue(message.data);
          sendResponse({ success: true, solution });
          break;

        case 'ai_optimize_selectors':
          const optimizedSelectors = await this.optimizeSelectors(message.data);
          sendResponse({ success: true, selectors: optimizedSelectors });
          break;

        case 'ai_chat':
          const response = await this.handleChatMessage(message.data);
          sendResponse({ success: true, response });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown AI request type' });
      }
    } catch (error) {
      console.error('AI request failed:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async analyzePage(pageData) {
    const prompt = this.buildPageAnalysisPrompt(pageData);
    
    const response = await this.sendAIRequest({
      prompt,
      context: 'page_analysis',
      maxTokens: 2000
    });

    return this.parseAnalysisResponse(response);
  }

  buildPageAnalysisPrompt(pageData) {
    return `
Analyze this webpage for testing and automation opportunities:

URL: ${pageData.url}
Title: ${pageData.title}
Forms found: ${pageData.forms?.length || 0}
Interactive elements: ${pageData.interactiveElements?.length || 0}
JavaScript errors: ${pageData.errors?.length || 0}

HTML Structure:
${pageData.htmlStructure ? JSON.stringify(pageData.htmlStructure, null, 2) : 'Not provided'}

Forms Details:
${pageData.forms ? JSON.stringify(pageData.forms, null, 2) : 'No forms found'}

Please provide:
1. Overall testability assessment (1-10 score)
2. Key areas that need testing
3. Potential automation challenges
4. Recommended test strategies
5. Critical user flows to validate
6. Accessibility concerns
7. Performance considerations

Format response as structured JSON.
`;
  }

  parseAnalysisResponse(response) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response.content);
      return parsed;
    } catch (error) {
      // If not JSON, parse structured text
      return {
        summary: response.content,
        score: this.extractScore(response.content),
        recommendations: this.extractRecommendations(response.content)
      };
    }
  }

  async generateTests(testRequest) {
    const prompt = this.buildTestGenerationPrompt(testRequest);
    
    const response = await this.sendAIRequest({
      prompt,
      context: 'test_generation',
      maxTokens: 3000
    });

    return this.parseTestResponse(response);
  }

  buildTestGenerationPrompt(testRequest) {
    return `
Generate comprehensive test cases for this web application:

Target: ${testRequest.target}
Type: ${testRequest.type} (form, interaction, e2e, performance)
Elements: ${JSON.stringify(testRequest.elements, null, 2)}
User Flows: ${JSON.stringify(testRequest.userFlows, null, 2)}

Requirements:
- Generate ${testRequest.testCount || 10} test cases
- Include positive and negative scenarios
- Cover edge cases
- Provide detailed step-by-step instructions
- Include expected results
- Add assertions for validation

Format as JSON array with structure:
{
  "testCases": [
    {
      "id": "test_001",
      "name": "Test Name",
      "description": "Test description",
      "priority": "high|medium|low",
      "type": "functional|ui|integration|performance",
      "steps": [
        {
          "action": "click|input|wait|verify",
          "target": "CSS selector",
          "value": "test value",
          "expected": "expected outcome"
        }
      ],
      "assertions": [
        {
          "type": "equals|contains|visible|enabled",
          "target": "CSS selector",
          "expected": "expected value"
        }
      ]
    }
  ]
}
`;
  }

  parseTestResponse(response) {
    try {
      const parsed = JSON.parse(response.content);
      return parsed.testCases || parsed;
    } catch (error) {
      // Parse structured text into test cases
      return this.extractTestCases(response.content);
    }
  }

  async debugIssue(issueData) {
    const prompt = this.buildDebugPrompt(issueData);
    
    const response = await this.sendAIRequest({
      prompt,
      context: 'debugging',
      maxTokens: 2000
    });

    return this.parseDebugResponse(response);
  }

  buildDebugPrompt(issueData) {
    return `
Help debug this web automation issue:

Error: ${issueData.error}
Context: ${issueData.context}
URL: ${issueData.url}
Action attempted: ${issueData.action}
Element: ${issueData.element}
Stack trace: ${issueData.stackTrace}

Browser: ${issueData.browser}
Extensions: ${JSON.stringify(issueData.extensions, null, 2)}

Provide:
1. Root cause analysis
2. Step-by-step solution
3. Alternative approaches
4. Prevention strategies
5. Code examples if applicable

Focus on practical, actionable solutions.
`;
  }

  parseDebugResponse(response) {
    return {
      rootCause: this.extractSection(response.content, 'root cause'),
      solution: this.extractSection(response.content, 'solution'),
      alternatives: this.extractSection(response.content, 'alternative'),
      prevention: this.extractSection(response.content, 'prevention'),
      codeExamples: this.extractCodeBlocks(response.content)
    };
  }

  async optimizeSelectors(selectorsData) {
    const prompt = this.buildSelectorOptimizationPrompt(selectorsData);
    
    const response = await this.sendAIRequest({
      prompt,
      context: 'selector_optimization',
      maxTokens: 1500
    });

    return this.parseSelectorResponse(response);
  }

  buildSelectorOptimizationPrompt(selectorsData) {
    return `
Optimize these CSS selectors for better reliability and performance:

Current selectors:
${JSON.stringify(selectorsData.selectors, null, 2)}

HTML context:
${selectorsData.htmlContext}

Issues encountered:
${JSON.stringify(selectorsData.issues, null, 2)}

Requirements:
- Improve reliability (resist DOM changes)
- Enhance performance
- Maintain specificity
- Add fallback options
- Follow best practices

Provide optimized selectors with explanations.
`;
  }

  parseSelectorResponse(response) {
    try {
      return JSON.parse(response.content);
    } catch (error) {
      return {
        optimizedSelectors: this.extractSelectors(response.content),
        explanations: this.extractExplanations(response.content)
      };
    }
  }

  async handleChatMessage(chatData) {
    const prompt = this.buildChatPrompt(chatData);
    
    const response = await this.sendAIRequest({
      prompt,
      context: 'chat',
      maxTokens: 1000,
      temperature: 0.7
    });

    // Add to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: chatData.message,
      timestamp: Date.now()
    });

    this.conversationHistory.push({
      role: 'assistant',
      content: response.content,
      timestamp: Date.now()
    });

    // Keep only last 20 messages
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }

    return {
      message: response.content,
      timestamp: Date.now(),
      conversationId: chatData.conversationId
    };
  }

  buildChatPrompt(chatData) {
    const context = `
You are Warp AI, an expert assistant for web automation and testing. 
You help users with browser extension development, testing strategies, 
debugging issues, and optimizing web automation workflows.

Previous conversation:
${this.conversationHistory.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Current page context: ${chatData.pageContext?.url || 'Unknown'}
User question: ${chatData.message}

Provide helpful, specific, and actionable advice.
`;

    return context;
  }

  async sendAIRequest(requestData) {
    const requestId = this.generateRequestId();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(requestData);
      if (this.config.enableCaching && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.config.cacheExpiry) {
          console.log('🔄 Using cached AI response');
          return cached.response;
        } else {
          this.cache.delete(cacheKey);
        }
      }

      // Track active request
      this.activeRequests.set(requestId, {
        startTime: Date.now(),
        context: requestData.context
      });

      const provider = this.getActiveProvider();
      const response = await this.callAIProvider(provider, requestData);

      // Cache successful response
      if (this.config.enableCaching && response.success) {
        this.cache.set(cacheKey, {
          response,
          timestamp: Date.now()
        });
      }

      // Clean up
      this.activeRequests.delete(requestId);

      return response;

    } catch (error) {
      this.activeRequests.delete(requestId);
      console.error('AI request failed:', error);
      
      // Try fallback provider
      if (this.config.defaultProvider !== 'local') {
        try {
          return await this.callAIProvider('local', requestData);
        } catch (fallbackError) {
          console.error('Fallback AI request also failed:', fallbackError);
        }
      }
      
      throw error;
    }
  }

  getActiveProvider() {
    const provider = this.config.providers[this.config.defaultProvider];
    if (provider?.enabled) {
      return this.config.defaultProvider;
    }

    // Find first enabled provider
    for (const [name, config] of Object.entries(this.config.providers)) {
      if (config.enabled) {
        return name;
      }
    }

    throw new Error('No AI providers are enabled');
  }

  async callAIProvider(providerName, requestData) {
    const provider = this.config.providers[providerName];
    if (!provider) {
      throw new Error(`Unknown AI provider: ${providerName}`);
    }

    switch (providerName) {
      case 'openai':
        return await this.callOpenAI(provider, requestData);
      case 'anthropic':
        return await this.callAnthropic(provider, requestData);
      case 'warp':
        return await this.callWarpAI(provider, requestData);
      case 'local':
        return await this.callLocalAI(provider, requestData);
      default:
        throw new Error(`Unsupported AI provider: ${providerName}`);
    }
  }

  async callOpenAI(provider, requestData) {
    const response = await fetch(`${provider.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          {
            role: 'system',
            content: 'You are Warp AI, an expert assistant for web automation and testing.'
          },
          {
            role: 'user',
            content: requestData.prompt
          }
        ],
        max_tokens: requestData.maxTokens || this.config.maxTokens,
        temperature: requestData.temperature || this.config.temperature
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      content: data.choices[0].message.content,
      provider: 'openai',
      model: provider.model,
      usage: data.usage
    };
  }

  async callAnthropic(provider, requestData) {
    const response = await fetch(`${provider.endpoint}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          {
            role: 'user',
            content: requestData.prompt
          }
        ],
        max_tokens: requestData.maxTokens || this.config.maxTokens,
        temperature: requestData.temperature || this.config.temperature
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      content: data.content[0].text,
      provider: 'anthropic',
      model: provider.model,
      usage: data.usage
    };
  }

  async callWarpAI(provider, requestData) {
    const response = await fetch(`${provider.endpoint}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: requestData.prompt,
        context: requestData.context,
        model: provider.model,
        maxTokens: requestData.maxTokens || this.config.maxTokens,
        temperature: requestData.temperature || this.config.temperature
      })
    });

    if (!response.ok) {
      throw new Error(`Warp AI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      content: data.response || data.content,
      provider: 'warp',
      model: provider.model,
      usage: data.usage
    };
  }

  async callLocalAI(provider, requestData) {
    try {
      const response = await fetch(`${provider.endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: provider.model,
          prompt: requestData.prompt,
          options: {
            temperature: requestData.temperature || this.config.temperature,
            num_predict: requestData.maxTokens || this.config.maxTokens
          },
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Local AI error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        content: data.response,
        provider: 'local',
        model: provider.model
      };
    } catch (error) {
      // If local AI is not available, provide a fallback response
      return {
        success: true,
        content: 'Local AI is not available. Please configure a cloud AI provider for full functionality.',
        provider: 'fallback',
        model: 'none'
      };
    }
  }

  // Utility methods
  generateRequestId() {
    return 'ai-req-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  generateCacheKey(requestData) {
    const keyData = {
      prompt: requestData.prompt?.substring(0, 100),
      context: requestData.context,
      maxTokens: requestData.maxTokens,
      temperature: requestData.temperature
    };
    return btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }

  extractScore(text) {
    const match = text.match(/(?:score|rating|assessment).*?([0-9]{1,2})/i);
    return match ? parseInt(match[1]) : null;
  }

  extractRecommendations(text) {
    const recommendations = [];
    const lines = text.split('\n');
    let inRecommendations = false;

    for (const line of lines) {
      if (line.toLowerCase().includes('recommendation') || line.toLowerCase().includes('suggest')) {
        inRecommendations = true;
        continue;
      }
      
      if (inRecommendations && line.trim()) {
        const cleaned = line.replace(/^\d+\.\s*|-\s*|\*\s*/, '').trim();
        if (cleaned.length > 10) {
          recommendations.push(cleaned);
        }
      }
    }

    return recommendations.slice(0, 10); // Limit to 10 recommendations
  }

  extractSection(text, sectionName) {
    const regex = new RegExp(`${sectionName}[:\\s]+(.*?)(?=\\n\\n|$)`, 'is');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  extractCodeBlocks(text) {
    const codeBlocks = [];
    const matches = text.matchAll(/```(\w+)?\n(.*?)```/gs);
    
    for (const match of matches) {
      codeBlocks.push({
        language: match[1] || 'javascript',
        code: match[2].trim()
      });
    }

    return codeBlocks;
  }

  extractSelectors(text) {
    const selectors = [];
    const selectorRegex = /['"`]([#.]?[a-zA-Z0-9\-_\[\]="':.\s>+~]+)['"`]/g;
    const matches = text.matchAll(selectorRegex);
    
    for (const match of matches) {
      const selector = match[1];
      if (selector.length > 2 && (selector.startsWith('.') || selector.startsWith('#') || selector.includes('['))) {
        selectors.push(selector);
      }
    }

    return [...new Set(selectors)]; // Remove duplicates
  }

  extractTestCases(text) {
    const testCases = [];
    const testRegex = /test[^\n]*:(.*?)(?=test[^\n]*:|$)/gis;
    const matches = text.matchAll(testRegex);
    
    let testId = 1;
    for (const match of matches) {
      testCases.push({
        id: `extracted_test_${testId++}`,
        name: match[0].split(':')[0].trim(),
        description: match[1].trim(),
        priority: 'medium',
        type: 'functional',
        steps: this.extractSteps(match[1]),
        assertions: []
      });
    }

    return testCases;
  }

  extractSteps(text) {
    const steps = [];
    const stepRegex = /(\d+\.|\-|\*)\s*([^.\n]+)/g;
    const matches = text.matchAll(stepRegex);
    
    for (const match of matches) {
      const stepText = match[2].trim();
      steps.push({
        action: this.inferAction(stepText),
        target: this.inferTarget(stepText),
        value: this.inferValue(stepText),
        expected: this.inferExpected(stepText)
      });
    }

    return steps;
  }

  inferAction(stepText) {
    const lowerText = stepText.toLowerCase();
    if (lowerText.includes('click')) return 'click';
    if (lowerText.includes('type') || lowerText.includes('enter') || lowerText.includes('input')) return 'input';
    if (lowerText.includes('wait')) return 'wait';
    if (lowerText.includes('verify') || lowerText.includes('check')) return 'verify';
    return 'action';
  }

  inferTarget(stepText) {
    // Try to extract CSS selectors or element descriptions
    const selectorMatch = stepText.match(/['"`]([#.]?[a-zA-Z0-9\-_\[\]="':.\s]+)['"`]/);
    if (selectorMatch) return selectorMatch[1];
    
    // Look for common element descriptions
    if (stepText.includes('button')) return 'button';
    if (stepText.includes('input')) return 'input';
    if (stepText.includes('form')) return 'form';
    
    return 'element';
  }

  inferValue(stepText) {
    const valueMatch = stepText.match(/(?:with|value|text)?\s*['"`]([^'"`]+)['"`]/);
    return valueMatch ? valueMatch[1] : null;
  }

  inferExpected(stepText) {
    const expectMatch = stepText.match(/(?:should|expect|verify).*?['"`]([^'"`]+)['"`]/);
    return expectMatch ? expectMatch[1] : null;
  }

  extractExplanations(text) {
    const explanations = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.includes('because') || line.includes('reason') || line.includes('explanation')) {
        explanations.push(line.trim());
      }
    }

    return explanations;
  }

  startHeartbeat() {
    // Periodic cleanup and health checks
    setInterval(() => {
      this.cleanupCache();
      this.cleanupActiveRequests();
    }, 300000); // 5 minutes
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.config.cacheExpiry) {
        this.cache.delete(key);
      }
    }
  }

  cleanupActiveRequests() {
    const now = Date.now();
    for (const [id, request] of this.activeRequests.entries()) {
      if (now - request.startTime > this.config.timeout) {
        this.activeRequests.delete(id);
        console.warn(`AI request ${id} timed out and was cleaned up`);
      }
    }
  }

  // Configuration methods
  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();
  }

  async setProvider(providerName, config) {
    if (!this.config.providers[providerName]) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    
    this.config.providers[providerName] = { ...this.config.providers[providerName], ...config };
    await this.saveConfig();
  }

  async setDefaultProvider(providerName) {
    if (!this.config.providers[providerName]) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    
    this.config.defaultProvider = providerName;
    await this.saveConfig();
  }

  // Public API methods
  async askAI(question, context = {}) {
    return await this.handleChatMessage({
      message: question,
      pageContext: context,
      conversationId: context.conversationId || 'default'
    });
  }

  async analyzeCurrentPage() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    if (!tab) {
      throw new Error('No active tab found');
    }

    // Get page data from content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'get_page_analysis_data'
    });

    if (!response?.success) {
      throw new Error('Failed to get page data');
    }

    return await this.analyzePage(response.data);
  }

  getStatus() {
    return {
      activeProvider: this.config.defaultProvider,
      enabledProviders: Object.entries(this.config.providers)
        .filter(([_, config]) => config.enabled)
        .map(([name]) => name),
      activeRequests: this.activeRequests.size,
      cacheSize: this.cache.size,
      conversationLength: this.conversationHistory.length
    };
  }

  clearCache() {
    this.cache.clear();
    console.log('AI cache cleared');
  }

  clearConversation() {
    this.conversationHistory = [];
    console.log('Conversation history cleared');
  }
}

// Export for use
window.WarpAIManager = WarpAIManager;
