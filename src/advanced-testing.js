// advanced-testing.js
// Avansert testing og validering for Warp Web Navigator

class AdvancedTesting {
  constructor() {
    this.testResults = []
    this.formValidators = new Map()
    this.testSuites = new Map()
    this.automationScripts = new Map()
    this.performanceMetrics = []
    this.ajaxInterceptor = null
    this.isRunning = false
    this.currentTest = null

    this.init()
  }

  init() {
    this.setupFormValidators()
    this.setupAjaxInterceptor()
    this.setupEventListeners()
    this.registerDefaultTestSuites()
  }

  // FORM VALIDATION AND TESTING
  setupFormValidators() {
    this.formValidators.set('email', {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
      test: value => this.formValidators.get('email').pattern.test(value),
    })

    this.formValidators.set('phone', {
      pattern: /^[\+]?[1-9][\d]{0,15}$/,
      message: 'Please enter a valid phone number',
      test: value => this.formValidators.get('phone').pattern.test(value.replace(/\s+/g, '')),
    })

    this.formValidators.set('url', {
      pattern:
        /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
      message: 'Please enter a valid URL',
      test: value => this.formValidators.get('url').pattern.test(value),
    })

    this.formValidators.set('password', {
      requirements: {
        minLength: 8,
        hasUppercase: /[A-Z]/,
        hasLowercase: /[a-z]/,
        hasNumbers: /\d/,
        hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/,
      },
      test: value => {
        const req = this.formValidators.get('password').requirements
        return {
          isValid:
            value.length >= req.minLength &&
            req.hasUppercase.test(value) &&
            req.hasLowercase.test(value) &&
            req.hasNumbers.test(value),
          details: {
            length: value.length >= req.minLength,
            uppercase: req.hasUppercase.test(value),
            lowercase: req.hasLowercase.test(value),
            numbers: req.hasNumbers.test(value),
            specialChars: req.hasSpecialChars.test(value),
          },
        }
      },
      message: 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
    })

    this.formValidators.set('creditCard', {
      test: value => {
        // Luhn algorithm for credit card validation
        const num = value.replace(/\D/g, '')
        if (num.length < 13 || num.length > 19) return false

        let sum = 0
        let isEven = false

        for (let i = num.length - 1; i >= 0; i--) {
          let digit = parseInt(num.charAt(i))

          if (isEven) {
            digit *= 2
            if (digit > 9) digit -= 9
          }

          sum += digit
          isEven = !isEven
        }

        return sum % 10 === 0
      },
      message: 'Please enter a valid credit card number',
    })
  }

  async validateForm(formSelector) {
    const form = document.querySelector(formSelector)
    if (!form) throw new Error(`Form not found: ${formSelector}`)

    const results = {
      isValid: true,
      fields: {},
      errors: [],
      warnings: [],
    }

    const fields = form.querySelectorAll('input, textarea, select')

    for (const field of fields) {
      const fieldResult = await this.validateField(field)
      results.fields[field.name || field.id] = fieldResult

      if (!fieldResult.isValid) {
        results.isValid = false
        results.errors.push({
          field: field.name || field.id,
          message: fieldResult.message,
          value: field.value,
        })
      }

      if (fieldResult.warnings?.length > 0) {
        results.warnings.push(...fieldResult.warnings)
      }
    }

    return results
  }

  async validateField(field) {
    const result = {
      isValid: true,
      message: '',
      warnings: [],
      suggestions: [],
    }

    const value = field.value?.trim() || ''
    const fieldType = field.type || 'text'
    const fieldName = (field.name || field.id || '').toLowerCase()

    // Required field validation
    if (field.required && !value) {
      result.isValid = false
      result.message = 'This field is required'
      return result
    }

    if (!value) return result // Skip validation for empty non-required fields

    // Type-specific validation
    switch (fieldType) {
      case 'email':
        const emailValidator = this.formValidators.get('email')
        if (!emailValidator.test(value)) {
          result.isValid = false
          result.message = emailValidator.message
        }
        break

      case 'tel':
        const phoneValidator = this.formValidators.get('phone')
        if (!phoneValidator.test(value)) {
          result.isValid = false
          result.message = phoneValidator.message
        }
        break

      case 'url':
        const urlValidator = this.formValidators.get('url')
        if (!urlValidator.test(value)) {
          result.isValid = false
          result.message = urlValidator.message
        }
        break

      case 'password':
        const passwordResult = this.formValidators.get('password').test(value)
        if (!passwordResult.isValid) {
          result.isValid = false
          result.message = this.formValidators.get('password').message
          result.suggestions = this.getPasswordSuggestions(passwordResult.details)
        }
        break
    }

    // Name-based validation
    if (fieldName.includes('credit') || fieldName.includes('card')) {
      const ccValidator = this.formValidators.get('creditCard')
      if (!ccValidator.test(value)) {
        result.isValid = false
        result.message = ccValidator.message
      }
    }

    // Additional checks
    if (field.pattern) {
      const regex = new RegExp(field.pattern)
      if (!regex.test(value)) {
        result.isValid = false
        result.message = field.title || 'Invalid format'
      }
    }

    if (field.minLength && value.length < field.minLength) {
      result.isValid = false
      result.message = `Minimum ${field.minLength} characters required`
    }

    if (field.maxLength && value.length > field.maxLength) {
      result.isValid = false
      result.message = `Maximum ${field.maxLength} characters allowed`
    }

    // Accessibility checks
    if (
      !field.labels?.length &&
      !field.getAttribute('aria-label') &&
      !field.getAttribute('aria-labelledby')
    ) {
      result.warnings.push('Field lacks proper labeling for accessibility')
    }

    return result
  }

  getPasswordSuggestions(details) {
    const suggestions = []
    if (!details.length) suggestions.push('Use at least 8 characters')
    if (!details.uppercase) suggestions.push('Include uppercase letters')
    if (!details.lowercase) suggestions.push('Include lowercase letters')
    if (!details.numbers) suggestions.push('Include numbers')
    if (!details.specialChars)
      suggestions.push('Consider adding special characters for extra security')
    return suggestions
  }

  // AUTOMATED FORM TESTING
  async testFormInteraction(formSelector, testData) {
    const startTime = performance.now()
    const testResult = {
      formSelector,
      startTime,
      endTime: null,
      duration: null,
      status: 'running',
      steps: [],
      errors: [],
      performance: {},
    }

    try {
      const form = document.querySelector(formSelector)
      if (!form) throw new Error(`Form not found: ${formSelector}`)

      // Step 1: Fill form fields
      testResult.steps.push(await this.fillFormFields(form, testData))

      // Step 2: Validate form
      testResult.steps.push(await this.performFormValidation(form))

      // Step 3: Test form submission (if specified)
      if (testData.submitForm !== false) {
        testResult.steps.push(await this.testFormSubmission(form))
      }

      // Step 4: Test form reset
      if (testData.testReset) {
        testResult.steps.push(await this.testFormReset(form))
      }

      testResult.status = 'completed'
    } catch (error) {
      testResult.status = 'failed'
      testResult.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
      })
    } finally {
      testResult.endTime = performance.now()
      testResult.duration = testResult.endTime - startTime
      testResult.performance = this.calculatePerformanceMetrics(testResult)
    }

    this.testResults.push(testResult)
    return testResult
  }

  async fillFormFields(form, testData) {
    const step = {
      name: 'Fill Form Fields',
      status: 'running',
      startTime: performance.now(),
      actions: [],
      errors: [],
    }

    try {
      for (const [fieldName, value] of Object.entries(testData.fields || {})) {
        const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`)

        if (!field) {
          step.errors.push(`Field not found: ${fieldName}`)
          continue
        }

        await this.simulateUserInput(field, value)
        step.actions.push({
          field: fieldName,
          value: value,
          type: field.type,
          success: true,
        })
      }

      step.status = step.errors.length > 0 ? 'partial' : 'completed'
    } catch (error) {
      step.status = 'failed'
      step.errors.push(error.message)
    }

    step.endTime = performance.now()
    step.duration = step.endTime - step.startTime
    return step
  }

  async simulateUserInput(field, value) {
    // Focus the field
    field.focus()
    await this.wait(50)

    // Clear existing value
    field.select()
    document.execCommand('delete', false, null)
    await this.wait(50)

    // Type the value character by character
    for (const char of value.toString()) {
      field.value += char

      // Dispatch input events
      field.dispatchEvent(new Event('input', { bubbles: true }))
      field.dispatchEvent(new Event('keyup', { bubbles: true }))

      await this.wait(20) // Realistic typing speed
    }

    // Dispatch change event
    field.dispatchEvent(new Event('change', { bubbles: true }))

    // Blur the field
    field.blur()
    await this.wait(50)
  }

  async performFormValidation(form) {
    const step = {
      name: 'Form Validation',
      status: 'running',
      startTime: performance.now(),
      validationResults: null,
      errors: [],
    }

    try {
      step.validationResults = await this.validateForm(form.getAttribute('id') || 'form')
      step.status = step.validationResults.isValid ? 'completed' : 'failed'

      if (!step.validationResults.isValid) {
        step.errors.push(...step.validationResults.errors.map(e => e.message))
      }
    } catch (error) {
      step.status = 'failed'
      step.errors.push(error.message)
    }

    step.endTime = performance.now()
    step.duration = step.endTime - step.startTime
    return step
  }

  async testFormSubmission(form) {
    const step = {
      name: 'Form Submission Test',
      status: 'running',
      startTime: performance.now(),
      submissionResult: null,
      errors: [],
    }

    try {
      // Set up submission monitoring
      let submissionCaptured = false
      let submissionResult = null

      const submitHandler = e => {
        submissionCaptured = true
        submissionResult = {
          prevented: e.defaultPrevented,
          target: e.target,
          timestamp: Date.now(),
        }
      }

      form.addEventListener('submit', submitHandler)

      // Find and click submit button
      const submitBtn = form.querySelector(
        '[type="submit"], button[type="submit"], button:not([type])'
      )

      if (submitBtn) {
        submitBtn.click()
        await this.wait(100)
      } else {
        // Try programmatic submission
        form.submit()
      }

      // Check if submission was handled
      if (submissionCaptured) {
        step.submissionResult = submissionResult
        step.status = 'completed'
      } else {
        step.status = 'no-submission'
        step.errors.push('No submission event captured')
      }

      form.removeEventListener('submit', submitHandler)
    } catch (error) {
      step.status = 'failed'
      step.errors.push(error.message)
    }

    step.endTime = performance.now()
    step.duration = step.endTime - step.startTime
    return step
  }

  async testFormReset(form) {
    const step = {
      name: 'Form Reset Test',
      status: 'running',
      startTime: performance.now(),
      resetResult: null,
      errors: [],
    }

    try {
      const initialValues = Array.from(form.elements).map(el => ({
        name: el.name,
        value: el.value,
        checked: el.checked,
      }))

      // Reset the form
      form.reset()
      await this.wait(50)

      // Verify reset
      const afterResetValues = Array.from(form.elements).map(el => ({
        name: el.name,
        value: el.value,
        checked: el.checked,
      }))

      const resetSuccessful = afterResetValues.every(
        el => !el.value || el.value === '' || el.checked === false
      )

      step.resetResult = {
        successful: resetSuccessful,
        beforeReset: initialValues,
        afterReset: afterResetValues,
      }

      step.status = resetSuccessful ? 'completed' : 'failed'
      if (!resetSuccessful) {
        step.errors.push('Form did not reset properly')
      }
    } catch (error) {
      step.status = 'failed'
      step.errors.push(error.message)
    }

    step.endTime = performance.now()
    step.duration = step.endTime - step.startTime
    return step
  }

  // AJAX AND ASYNC MONITORING
  setupAjaxInterceptor() {
    const originalFetch = window.fetch
    const originalXHROpen = XMLHttpRequest.prototype.open
    const originalXHRSend = XMLHttpRequest.prototype.send

    const ajaxCalls = []

    // Intercept fetch
    window.fetch = async function (...args) {
      const startTime = performance.now()
      const request = {
        method: 'GET',
        url: args[0],
        type: 'fetch',
        startTime,
        endTime: null,
        duration: null,
        status: null,
        success: null,
      }

      if (args[1]) {
        request.method = args[1].method || 'GET'
      }

      try {
        const response = await originalFetch.apply(this, args)
        request.endTime = performance.now()
        request.duration = request.endTime - startTime
        request.status = response.status
        request.success = response.ok

        ajaxCalls.push(request)
        return response
      } catch (error) {
        request.endTime = performance.now()
        request.duration = request.endTime - startTime
        request.success = false
        request.error = error.message

        ajaxCalls.push(request)
        throw error
      }
    }

    // Intercept XMLHttpRequest
    XMLHttpRequest.prototype.open = function (method, url, async) {
      this._warpMethod = method
      this._warpUrl = url
      this._warpStartTime = performance.now()
      return originalXHROpen.apply(this, arguments)
    }

    XMLHttpRequest.prototype.send = function (data) {
      const xhr = this
      const originalOnReadyStateChange = this.onreadystatechange

      this.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          const request = {
            method: xhr._warpMethod || 'GET',
            url: xhr._warpUrl,
            type: 'xhr',
            startTime: xhr._warpStartTime,
            endTime: performance.now(),
            duration: null,
            status: xhr.status,
            success: xhr.status >= 200 && xhr.status < 300,
          }

          request.duration = request.endTime - request.startTime
          ajaxCalls.push(request)
        }

        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.apply(this, arguments)
        }
      }

      return originalXHRSend.apply(this, arguments)
    }

    this.ajaxInterceptor = {
      getCalls: () => ajaxCalls,
      clearCalls: () => (ajaxCalls.length = 0),
      getStats: () => ({
        total: ajaxCalls.length,
        successful: ajaxCalls.filter(c => c.success).length,
        failed: ajaxCalls.filter(c => !c.success).length,
        averageTime:
          ajaxCalls.length > 0
            ? ajaxCalls.reduce((sum, call) => sum + call.duration, 0) / ajaxCalls.length
            : 0,
      }),
    }
  }

  // COMPLEX INTERACTION SEQUENCES
  async runInteractionSequence(sequence) {
    const result = {
      sequenceName: sequence.name,
      startTime: performance.now(),
      steps: [],
      status: 'running',
      errors: [],
    }

    try {
      for (let i = 0; i < sequence.steps.length; i++) {
        const step = sequence.steps[i]
        const stepResult = await this.executeInteractionStep(step, i)
        result.steps.push(stepResult)

        if (stepResult.status === 'failed' && sequence.stopOnFailure !== false) {
          result.status = 'failed'
          break
        }

        // Wait between steps if specified
        if (step.waitAfter) {
          await this.wait(step.waitAfter)
        }
      }

      if (result.status === 'running') {
        result.status = 'completed'
      }
    } catch (error) {
      result.status = 'failed'
      result.errors.push({
        message: error.message,
        stack: error.stack,
      })
    }

    result.endTime = performance.now()
    result.duration = result.endTime - result.startTime
    return result
  }

  async executeInteractionStep(step, index) {
    const stepResult = {
      index,
      name: step.name || `Step ${index + 1}`,
      type: step.type,
      status: 'running',
      startTime: performance.now(),
      error: null,
    }

    try {
      switch (step.type) {
        case 'click':
          await this.performClick(step.selector, step.options)
          break

        case 'input':
          await this.performInput(step.selector, step.value, step.options)
          break

        case 'scroll':
          await this.performScroll(step.target, step.options)
          break

        case 'wait':
          await this.wait(step.duration)
          break

        case 'waitForElement':
          await this.waitForElement(step.selector, step.timeout)
          break

        case 'screenshot':
          await this.takeScreenshot(step.options)
          break

        case 'validate':
          await this.performValidation(step.selector, step.validation)
          break

        case 'custom':
          if (typeof step.execute === 'function') {
            await step.execute()
          }
          break

        default:
          throw new Error(`Unknown step type: ${step.type}`)
      }

      stepResult.status = 'completed'
    } catch (error) {
      stepResult.status = 'failed'
      stepResult.error = {
        message: error.message,
        stack: error.stack,
      }
    }

    stepResult.endTime = performance.now()
    stepResult.duration = stepResult.endTime - stepResult.startTime
    return stepResult
  }

  async performClick(selector, options = {}) {
    const element = document.querySelector(selector)
    if (!element) throw new Error(`Element not found: ${selector}`)

    // Scroll to element if needed
    if (options.scrollIntoView !== false) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await this.wait(100)
    }

    // Simulate mouse events
    const rect = element.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    const mouseEvents = ['mousedown', 'mouseup', 'click']

    for (const eventType of mouseEvents) {
      const event = new MouseEvent(eventType, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
      })

      element.dispatchEvent(event)
      await this.wait(10)
    }
  }

  async performInput(selector, value, options = {}) {
    const element = document.querySelector(selector)
    if (!element) throw new Error(`Element not found: ${selector}`)

    await this.simulateUserInput(element, value)
  }

  async performScroll(target, options = {}) {
    const behavior = options.smooth !== false ? 'smooth' : 'auto'

    if (typeof target === 'string') {
      const element = document.querySelector(target)
      if (element) {
        element.scrollIntoView({ behavior, block: options.block || 'start' })
      }
    } else if (typeof target === 'object') {
      window.scrollTo({
        top: target.y || 0,
        left: target.x || 0,
        behavior,
      })
    }

    await this.wait(options.waitAfter || 200)
  }

  async waitForElement(selector, timeout = 5000) {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector)
      if (element && element.offsetParent !== null) {
        return element
      }
      await this.wait(100)
    }

    throw new Error(`Element not found within ${timeout}ms: ${selector}`)
  }

  async takeScreenshot(options = {}) {
    // This would integrate with browser extension APIs
    // For now, we'll just log the screenshot request
    console.log('📸 Screenshot requested:', options)

    return {
      timestamp: Date.now(),
      options,
      status: 'simulated',
    }
  }

  async performValidation(selector, validation) {
    const element = document.querySelector(selector)
    if (!element) throw new Error(`Element not found: ${selector}`)

    switch (validation.type) {
      case 'exists':
        // Element existence already validated above
        break

      case 'visible':
        if (element.offsetParent === null) {
          throw new Error('Element is not visible')
        }
        break

      case 'text':
        const text = element.textContent.trim()
        if (validation.equals && text !== validation.equals) {
          throw new Error(`Text mismatch. Expected: "${validation.equals}", Got: "${text}"`)
        }
        if (validation.contains && !text.includes(validation.contains)) {
          throw new Error(`Text does not contain: "${validation.contains}"`)
        }
        break

      case 'value':
        if (validation.equals && element.value !== validation.equals) {
          throw new Error(
            `Value mismatch. Expected: "${validation.equals}", Got: "${element.value}"`
          )
        }
        break

      case 'attribute':
        const attrValue = element.getAttribute(validation.attribute)
        if (validation.equals && attrValue !== validation.equals) {
          throw new Error(
            `Attribute "${validation.attribute}" mismatch. Expected: "${validation.equals}", Got: "${attrValue}"`
          )
        }
        break

      default:
        throw new Error(`Unknown validation type: ${validation.type}`)
    }
  }

  // DEFAULT TEST SUITES
  registerDefaultTestSuites() {
    // Basic form validation test suite
    this.testSuites.set('basicFormValidation', {
      name: 'Basic Form Validation',
      description: 'Tests basic form field validation',
      tests: [
        {
          name: 'Required Fields',
          type: 'validation',
          execute: async form => {
            const requiredFields = form.querySelectorAll('[required]')
            const results = []

            for (const field of requiredFields) {
              field.value = ''
              const validation = await this.validateField(field)
              results.push({
                field: field.name || field.id,
                passed: !validation.isValid,
                message: validation.message,
              })
            }

            return results
          },
        },
        {
          name: 'Email Validation',
          type: 'validation',
          execute: async form => {
            const emailFields = form.querySelectorAll('[type="email"]')
            const testValues = ['invalid-email', 'test@', '@test.com', 'test@valid.com']
            const results = []

            for (const field of emailFields) {
              for (const value of testValues) {
                field.value = value
                const validation = await this.validateField(field)
                const shouldBeValid = value === 'test@valid.com'

                results.push({
                  field: field.name || field.id,
                  value,
                  passed: validation.isValid === shouldBeValid,
                  expected: shouldBeValid,
                  actual: validation.isValid,
                })
              }
            }

            return results
          },
        },
      ],
    })

    // User interaction test suite
    this.testSuites.set('userInteraction', {
      name: 'User Interaction Testing',
      description: 'Tests complex user interaction sequences',
      tests: [
        {
          name: 'Form Fill and Submit',
          type: 'interaction',
          execute: async () => {
            const forms = document.querySelectorAll('form')
            const results = []

            for (const form of forms) {
              const testData = this.generateFormTestData(form)
              const result = await this.testFormInteraction(form, testData)
              results.push(result)
            }

            return results
          },
        },
      ],
    })
  }

  generateFormTestData(form) {
    const testData = { fields: {} }
    const fields = form.querySelectorAll('input, textarea, select')

    for (const field of fields) {
      const fieldName = field.name || field.id
      if (!fieldName) continue

      switch (field.type) {
        case 'email':
          testData.fields[fieldName] = 'test@example.com'
          break
        case 'password':
          testData.fields[fieldName] = 'TestPassword123!'
          break
        case 'tel':
          testData.fields[fieldName] = '+1234567890'
          break
        case 'url':
          testData.fields[fieldName] = 'https://example.com'
          break
        case 'number':
          testData.fields[fieldName] = '42'
          break
        case 'date':
          testData.fields[fieldName] = '2023-12-25'
          break
        case 'checkbox':
          testData.fields[fieldName] = Math.random() > 0.5
          break
        case 'radio':
          // Skip radio buttons as they need group handling
          break
        default:
          if (field.tagName === 'SELECT') {
            const options = field.querySelectorAll('option')
            if (options.length > 1) {
              testData.fields[fieldName] = options[1].value
            }
          } else {
            testData.fields[fieldName] = `Test ${fieldName}`
          }
      }
    }

    return testData
  }

  // UTILITY METHODS
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  calculatePerformanceMetrics(testResult) {
    return {
      totalDuration: testResult.duration,
      stepsCompleted: testResult.steps.filter(s => s.status === 'completed').length,
      stepsFailed: testResult.steps.filter(s => s.status === 'failed').length,
      averageStepDuration:
        testResult.steps.length > 0
          ? testResult.steps.reduce((sum, step) => sum + step.duration, 0) / testResult.steps.length
          : 0,
    }
  }

  setupEventListeners() {
    // Listen for form submissions to automatically run validation
    document.addEventListener('submit', async e => {
      if (this.autoValidateOnSubmit) {
        const validation = await this.validateForm(e.target)
        if (!validation.isValid) {
          console.warn('Form validation failed:', validation)
        }
      }
    })
  }

  // PUBLIC API
  async runTestSuite(suiteName, target) {
    const suite = this.testSuites.get(suiteName)
    if (!suite) throw new Error(`Test suite not found: ${suiteName}`)

    const results = {
      suiteName,
      startTime: performance.now(),
      tests: [],
      status: 'running',
    }

    try {
      for (const test of suite.tests) {
        const testResult = {
          name: test.name,
          startTime: performance.now(),
          status: 'running',
        }

        try {
          testResult.result = await test.execute(target)
          testResult.status = 'completed'
        } catch (error) {
          testResult.status = 'failed'
          testResult.error = error.message
        }

        testResult.endTime = performance.now()
        testResult.duration = testResult.endTime - testResult.startTime
        results.tests.push(testResult)
      }

      results.status = 'completed'
    } catch (error) {
      results.status = 'failed'
      results.error = error.message
    }

    results.endTime = performance.now()
    results.duration = results.endTime - results.startTime

    this.testResults.push(results)
    return results
  }

  getTestResults() {
    return this.testResults
  }

  getPerformanceReport() {
    return {
      testResults: this.testResults,
      ajaxStats: this.ajaxInterceptor.getStats(),
      performanceMetrics: this.performanceMetrics,
      timestamp: Date.now(),
    }
  }

  exportResults(format = 'json') {
    const report = this.getPerformanceReport()

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(report, null, 2)

      case 'csv':
        return this.convertToCSV(report)

      case 'html':
        return this.generateHTMLReport(report)

      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  convertToCSV(report) {
    const rows = []
    rows.push(['Test Name', 'Status', 'Duration (ms)', 'Errors', 'Timestamp'])

    report.testResults.forEach(result => {
      if (result.tests) {
        result.tests.forEach(test => {
          rows.push([
            test.name,
            test.status,
            test.duration,
            test.error || '',
            new Date(test.startTime).toISOString(),
          ])
        })
      } else if (result.steps) {
        result.steps.forEach(step => {
          rows.push([
            step.name,
            step.status,
            step.duration,
            step.errors?.join('; ') || '',
            new Date(step.startTime).toISOString(),
          ])
        })
      }
    })

    return rows.map(row => row.map(field => `"${field}"`).join(',')).join('\n')
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Warp Advanced Testing Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; }
        .test-result { margin: 10px 0; padding: 10px; border-left: 4px solid #ccc; }
        .status-completed { border-left-color: #4CAF50; }
        .status-failed { border-left-color: #f44336; }
        .status-partial { border-left-color: #FF9800; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .metrics { display: flex; justify-content: space-around; margin: 20px 0; }
        .metric { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Warp Advanced Testing Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="metrics">
        <div class="metric">
            <h3>${report.testResults.length}</h3>
            <p>Total Tests</p>
        </div>
        <div class="metric">
            <h3>${report.testResults.filter(r => r.status === 'completed').length}</h3>
            <p>Completed</p>
        </div>
        <div class="metric">
            <h3>${report.testResults.filter(r => r.status === 'failed').length}</h3>
            <p>Failed</p>
        </div>
        <div class="metric">
            <h3>${Math.round(report.ajaxStats.averageTime)}ms</h3>
            <p>Avg Response Time</p>
        </div>
    </div>

    <div class="section">
        <h2>Test Results</h2>
        ${report.testResults
          .map(
            result => `
            <div class="test-result status-${result.status}">
                <h3>${result.suiteName || result.formSelector || 'Test'}</h3>
                <p><strong>Status:</strong> ${result.status}</p>
                <p><strong>Duration:</strong> ${Math.round(result.duration)}ms</p>
                ${result.errors?.length > 0 ? `<p><strong>Errors:</strong> ${result.errors.map(e => e.message).join(', ')}</p>` : ''}
            </div>
        `
          )
          .join('')}
    </div>

    <div class="section">
        <h2>AJAX Performance</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Value</th>
            </tr>
            <tr>
                <td>Total Requests</td>
                <td>${report.ajaxStats.total}</td>
            </tr>
            <tr>
                <td>Successful</td>
                <td>${report.ajaxStats.successful}</td>
            </tr>
            <tr>
                <td>Failed</td>
                <td>${report.ajaxStats.failed}</td>
            </tr>
            <tr>
                <td>Average Response Time</td>
                <td>${Math.round(report.ajaxStats.averageTime)}ms</td>
            </tr>
        </table>
    </div>
</body>
</html>
    `
  }
}

// Export for use
window.AdvancedTesting = AdvancedTesting
