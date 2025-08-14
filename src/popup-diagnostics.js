// popup-diagnostics.js
// Integrasjon av diagnostikkmodul med popup UI

class PopupDiagnostics {
  constructor(diagnosticsModule) {
    this.diagnostics = diagnosticsModule;
    this.container = null;
    this.isVisible = false;
    this.autoRefresh = null;
    this.init();
  }

  init() {
    this.createUI();
    this.bindEvents();
    this.startAutoRefresh();
  }

  createUI() {
    // Create diagnostics panel in popup
    this.container = document.createElement('div');
    this.container.id = 'warp-diagnostics-panel';
    this.container.className = 'diagnostics-panel';
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 350px;
      max-height: 500px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      z-index: 10000;
      display: none;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      overflow: hidden;
    `;

    this.container.innerHTML = `
      <div class="diagnostics-header" style="
        padding: 15px 20px;
        background: rgba(255,255,255,0.1);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255,255,255,0.2);
        display: flex;
        justify-content: between;
        align-items: center;
      ">
        <h3 style="
          margin: 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
        ">
          <span style="margin-right: 8px;">🔧</span>
          Warp Diagnostics
        </h3>
        <button id="warp-diagnostics-close" style="
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
        ">×</button>
      </div>
      <div class="diagnostics-content" style="
        padding: 20px;
        max-height: 400px;
        overflow-y: auto;
        color: white;
      ">
        <div class="status-overview" style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0; font-size: 14px; color: rgba(255,255,255,0.9);">System Status</h4>
          <div id="system-status" style="
            background: rgba(255,255,255,0.1);
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 15px;
          ">
            <div class="status-indicator" style="
              display: flex;
              align-items: center;
              margin-bottom: 8px;
            ">
              <span id="health-indicator" style="
                width: 12px;
                height: 12px;
                border-radius: 50%;
                margin-right: 8px;
                background: #4CAF50;
              "></span>
              <span id="health-text" style="font-weight: 500;">System Healthy</span>
            </div>
            <div style="font-size: 12px; opacity: 0.8;">
              <div>Last Check: <span id="last-check-time">--</span></div>
              <div>Uptime: <span id="uptime">--</span></div>
            </div>
          </div>
        </div>

        <div class="diagnostics-tabs" style="margin-bottom: 15px;">
          <div style="display: flex; border-bottom: 1px solid rgba(255,255,255,0.2);">
            <button class="tab-btn active" data-tab="overview" style="
              flex: 1;
              padding: 8px 12px;
              background: none;
              border: none;
              color: white;
              cursor: pointer;
              border-bottom: 2px solid transparent;
              transition: all 0.2s;
            ">Overview</button>
            <button class="tab-btn" data-tab="errors" style="
              flex: 1;
              padding: 8px 12px;
              background: none;
              border: none;
              color: white;
              cursor: pointer;
              border-bottom: 2px solid transparent;
              transition: all 0.2s;
            ">Errors</button>
            <button class="tab-btn" data-tab="performance" style="
              flex: 1;
              padding: 8px 12px;
              background: none;
              border: none;
              color: white;
              cursor: pointer;
              border-bottom: 2px solid transparent;
              transition: all 0.2s;
            ">Performance</button>
            <button class="tab-btn" data-tab="actions" style="
              flex: 1;
              padding: 8px 12px;
              background: none;
              border: none;
              color: white;
              cursor: pointer;
              border-bottom: 2px solid transparent;
              transition: all 0.2s;
            ">Actions</button>
          </div>
        </div>

        <div class="tab-content">
          <div id="tab-overview" class="tab-pane active">
            <div id="component-status" style="margin-bottom: 15px;">
              <h5 style="margin: 0 0 8px 0; font-size: 13px;">Component Status</h5>
              <div id="component-list"></div>
            </div>
            <div id="recent-activity" style="margin-bottom: 15px;">
              <h5 style="margin: 0 0 8px 0; font-size: 13px;">Recent Activity</h5>
              <div id="activity-list" style="
                background: rgba(0,0,0,0.2);
                border-radius: 6px;
                padding: 8px;
                font-size: 11px;
                max-height: 100px;
                overflow-y: auto;
              "></div>
            </div>
          </div>

          <div id="tab-errors" class="tab-pane" style="display: none;">
            <div id="error-list"></div>
          </div>

          <div id="tab-performance" class="tab-pane" style="display: none;">
            <div id="performance-metrics"></div>
          </div>

          <div id="tab-actions" class="tab-pane" style="display: none;">
            <div style="display: grid; gap: 10px;">
              <button id="run-health-check" class="action-btn" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 10px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s;
              ">🔍 Run Health Check</button>
              <button id="clear-storage" class="action-btn" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 10px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s;
              ">🗑️ Clear Storage</button>
              <button id="reset-settings" class="action-btn" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 10px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s;
              ">⚙️ Reset Settings</button>
              <button id="export-logs" class="action-btn" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 10px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s;
              ">📤 Export Logs</button>
              <button id="generate-report" class="action-btn" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 10px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s;
              ">📊 Generate Report</button>
            </div>
          </div>
        </div>
      </div>
      <div class="diagnostics-footer" style="
        padding: 10px 20px;
        background: rgba(0,0,0,0.2);
        border-top: 1px solid rgba(255,255,255,0.1);
        font-size: 11px;
        color: rgba(255,255,255,0.7);
        text-align: center;
      ">
        Auto-refresh every 30s • <span id="data-timestamp">--</span>
      </div>
    `;

    document.body.appendChild(this.container);
  }

  bindEvents() {
    // Close button
    document.getElementById('warp-diagnostics-close').addEventListener('click', () => {
      this.hide();
    });

    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Action buttons
    this.bindActionButtons();

    // Hover effects
    const actionBtns = document.querySelectorAll('.action-btn');
    actionBtns.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(255,255,255,0.3)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(255,255,255,0.2)';
      });
    });

    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        if (!btn.classList.contains('active')) {
          btn.style.borderBottomColor = 'rgba(255,255,255,0.5)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (!btn.classList.contains('active')) {
          btn.style.borderBottomColor = 'transparent';
        }
      });
    });
  }

  bindActionButtons() {
    document.getElementById('run-health-check').addEventListener('click', async () => {
      this.showLoading('Running health check...');
      try {
        await this.diagnostics.runHealthCheck();
        this.updateDisplay();
        this.showNotification('Health check completed', 'success');
      } catch (error) {
        this.showNotification('Health check failed: ' + error.message, 'error');
      }
    });

    document.getElementById('clear-storage').addEventListener('click', async () => {
      if (confirm('This will clear all stored data. Continue?')) {
        this.showLoading('Clearing storage...');
        try {
          await this.diagnostics.clearStorage();
          this.showNotification('Storage cleared successfully', 'success');
        } catch (error) {
          this.showNotification('Failed to clear storage: ' + error.message, 'error');
        }
      }
    });

    document.getElementById('reset-settings').addEventListener('click', async () => {
      if (confirm('This will reset all settings to defaults. Continue?')) {
        this.showLoading('Resetting settings...');
        try {
          await this.diagnostics.resetSettings();
          this.showNotification('Settings reset successfully', 'success');
        } catch (error) {
          this.showNotification('Failed to reset settings: ' + error.message, 'error');
        }
      }
    });

    document.getElementById('export-logs').addEventListener('click', () => {
      try {
        const logs = this.diagnostics.exportLogs();
        this.downloadFile('warp-diagnostics-logs.json', JSON.stringify(logs, null, 2));
        this.showNotification('Logs exported successfully', 'success');
      } catch (error) {
        this.showNotification('Failed to export logs: ' + error.message, 'error');
      }
    });

    document.getElementById('generate-report').addEventListener('click', async () => {
      this.showLoading('Generating report...');
      try {
        const report = await this.diagnostics.generateReport();
        this.downloadFile('warp-diagnostics-report.html', this.generateHTMLReport(report));
        this.showNotification('Report generated successfully', 'success');
      } catch (error) {
        this.showNotification('Failed to generate report: ' + error.message, 'error');
      }
    });
  }

  switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.style.borderBottomColor = 'transparent';
    });
    
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.querySelector(`[data-tab="${tabId}"]`).style.borderBottomColor = 'white';

    // Update tab content
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.style.display = 'none';
    });
    
    document.getElementById(`tab-${tabId}`).style.display = 'block';

    // Load specific tab data
    this.loadTabData(tabId);
  }

  async loadTabData(tabId) {
    switch (tabId) {
      case 'overview':
        this.updateOverview();
        break;
      case 'errors':
        this.updateErrors();
        break;
      case 'performance':
        this.updatePerformance();
        break;
      case 'actions':
        // Actions are static, no need to update
        break;
    }
  }

  updateOverview() {
    const status = this.diagnostics.getSystemStatus();
    
    // Update component status
    const componentList = document.getElementById('component-list');
    componentList.innerHTML = '';
    
    Object.entries(status.components).forEach(([name, info]) => {
      const statusColor = info.healthy ? '#4CAF50' : '#f44336';
      const statusIcon = info.healthy ? '✓' : '✗';
      
      const component = document.createElement('div');
      component.style.cssText = `
        display: flex;
        justify-content: between;
        align-items: center;
        padding: 6px 10px;
        margin: 4px 0;
        background: rgba(255,255,255,0.1);
        border-radius: 4px;
        font-size: 12px;
      `;
      
      component.innerHTML = `
        <span style="display: flex; align-items: center;">
          <span style="color: ${statusColor}; margin-right: 8px; font-weight: bold;">${statusIcon}</span>
          ${name}
        </span>
        <span style="opacity: 0.7;">${info.lastCheck || 'Never'}</span>
      `;
      
      componentList.appendChild(component);
    });

    // Update recent activity
    this.updateRecentActivity();
  }

  updateRecentActivity() {
    const activities = this.diagnostics.getRecentActivities(10);
    const activityList = document.getElementById('activity-list');
    
    if (activities.length === 0) {
      activityList.innerHTML = '<div style="opacity: 0.6; text-align: center; padding: 10px;">No recent activity</div>';
      return;
    }

    activityList.innerHTML = activities.map(activity => `
      <div style="margin: 4px 0; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; justify-content: between; align-items: center;">
          <span>${activity.action}</span>
          <span style="opacity: 0.6; font-size: 10px;">${this.formatTime(activity.timestamp)}</span>
        </div>
        ${activity.details ? `<div style="opacity: 0.7; font-size: 10px; margin-top: 2px;">${activity.details}</div>` : ''}
      </div>
    `).join('');
  }

  updateErrors() {
    const errors = this.diagnostics.getErrors();
    const errorList = document.getElementById('error-list');
    
    if (errors.length === 0) {
      errorList.innerHTML = '<div style="text-align: center; opacity: 0.6; padding: 20px;">🎉 No errors found!</div>';
      return;
    }

    errorList.innerHTML = errors.map(error => `
      <div style="
        background: rgba(244, 67, 54, 0.2);
        border: 1px solid rgba(244, 67, 54, 0.3);
        border-radius: 6px;
        padding: 12px;
        margin: 8px 0;
      ">
        <div style="display: flex; justify-content: between; align-items: flex-start; margin-bottom: 6px;">
          <strong style="color: #ffcdd2;">${error.type}</strong>
          <span style="opacity: 0.7; font-size: 11px;">${this.formatTime(error.timestamp)}</span>
        </div>
        <div style="font-size: 12px; margin-bottom: 6px; word-break: break-word;">${error.message}</div>
        ${error.stack ? `<details style="margin-top: 8px;">
          <summary style="cursor: pointer; font-size: 11px; opacity: 0.8;">Stack trace</summary>
          <pre style="font-size: 10px; margin: 4px 0 0 0; opacity: 0.7; white-space: pre-wrap;">${error.stack}</pre>
        </details>` : ''}
        <div style="margin-top: 8px;">
          <button onclick="navigator.clipboard.writeText('${JSON.stringify(error).replace(/'/g, "\\'")}').then(() => this.textContent = 'Copied!')" 
                  style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer;">
            Copy Error
          </button>
        </div>
      </div>
    `).join('');
  }

  updatePerformance() {
    const metrics = this.diagnostics.getPerformanceMetrics();
    const performanceContainer = document.getElementById('performance-metrics');
    
    performanceContainer.innerHTML = `
      <div style="display: grid; gap: 12px;">
        <div class="metric-card" style="
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 15px;
        ">
          <h5 style="margin: 0 0 10px 0; font-size: 13px; color: rgba(255,255,255,0.9);">Memory Usage</h5>
          <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 8px;">
            <span>Current:</span>
            <strong>${this.formatBytes(metrics.memory.usedJSHeapSize)}</strong>
          </div>
          <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 8px;">
            <span>Limit:</span>
            <span>${this.formatBytes(metrics.memory.jsHeapSizeLimit)}</span>
          </div>
          <div style="
            background: rgba(0,0,0,0.2);
            border-radius: 4px;
            height: 8px;
            overflow: hidden;
          ">
            <div style="
              background: linear-gradient(90deg, #4CAF50, #FFC107, #f44336);
              height: 100%;
              width: ${(metrics.memory.usedJSHeapSize / metrics.memory.jsHeapSizeLimit) * 100}%;
              transition: width 0.3s;
            "></div>
          </div>
        </div>

        <div class="metric-card" style="
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 15px;
        ">
          <h5 style="margin: 0 0 10px 0; font-size: 13px; color: rgba(255,255,255,0.9);">Response Times</h5>
          <div style="display: grid; gap: 6px;">
            ${Object.entries(metrics.responseTimes).map(([operation, time]) => `
              <div style="display: flex; justify-content: between; align-items: center;">
                <span style="font-size: 12px;">${operation}:</span>
                <span style="font-weight: bold; color: ${time < 100 ? '#4CAF50' : time < 500 ? '#FFC107' : '#f44336'};">
                  ${time}ms
                </span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="metric-card" style="
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 15px;
        ">
          <h5 style="margin: 0 0 10px 0; font-size: 13px; color: rgba(255,255,255,0.9);">Statistics</h5>
          <div style="display: grid; gap: 6px; font-size: 12px;">
            <div style="display: flex; justify-content: between;">
              <span>Total Operations:</span>
              <strong>${metrics.totalOperations}</strong>
            </div>
            <div style="display: flex; justify-content: between;">
              <span>Failed Operations:</span>
              <strong style="color: ${metrics.failedOperations > 0 ? '#f44336' : '#4CAF50'};">${metrics.failedOperations}</strong>
            </div>
            <div style="display: flex; justify-content: between;">
              <span>Success Rate:</span>
              <strong style="color: ${metrics.successRate > 95 ? '#4CAF50' : metrics.successRate > 80 ? '#FFC107' : '#f44336'};">${metrics.successRate}%</strong>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  show() {
    this.isVisible = true;
    this.container.style.display = 'block';
    this.updateDisplay();
    
    // Animate in
    this.container.style.transform = 'translateY(-20px)';
    this.container.style.opacity = '0';
    setTimeout(() => {
      this.container.style.transition = 'all 0.3s ease';
      this.container.style.transform = 'translateY(0)';
      this.container.style.opacity = '1';
    }, 10);
  }

  hide() {
    this.isVisible = false;
    this.container.style.transition = 'all 0.3s ease';
    this.container.style.transform = 'translateY(-20px)';
    this.container.style.opacity = '0';
    
    setTimeout(() => {
      this.container.style.display = 'none';
      this.container.style.transition = '';
    }, 300);
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  updateDisplay() {
    const status = this.diagnostics.getSystemStatus();
    
    // Update health indicator
    const healthIndicator = document.getElementById('health-indicator');
    const healthText = document.getElementById('health-text');
    
    if (status.overall.healthy) {
      healthIndicator.style.background = '#4CAF50';
      healthText.textContent = 'System Healthy';
    } else {
      healthIndicator.style.background = '#f44336';
      healthText.textContent = 'Issues Detected';
    }
    
    // Update timestamps
    document.getElementById('last-check-time').textContent = this.formatTime(status.overall.lastCheck);
    document.getElementById('uptime').textContent = this.formatDuration(Date.now() - status.overall.startTime);
    document.getElementById('data-timestamp').textContent = this.formatTime(Date.now());
    
    // Update current tab
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'overview';
    this.loadTabData(activeTab);
  }

  startAutoRefresh() {
    this.autoRefresh = setInterval(() => {
      if (this.isVisible) {
        this.updateDisplay();
      }
    }, 30000); // 30 seconds
  }

  stopAutoRefresh() {
    if (this.autoRefresh) {
      clearInterval(this.autoRefresh);
      this.autoRefresh = null;
    }
  }

  showLoading(message) {
    // Show loading overlay
    const overlay = document.createElement('div');
    overlay.id = 'diagnostics-loading';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
      backdrop-filter: blur(4px);
    `;
    overlay.innerHTML = `
      <div style="text-align: center;">
        <div style="
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px auto;
        "></div>
        ${message}
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    this.container.appendChild(overlay);
    
    // Remove after 5 seconds max
    setTimeout(() => {
      const loader = document.getElementById('diagnostics-loading');
      if (loader) loader.remove();
    }, 5000);
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 380px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      font-size: 13px;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  generateHTMLReport(reportData) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Warp Web Navigator - Diagnostics Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .status-good { color: #4CAF50; }
        .status-warning { color: #FF9800; }
        .status-error { color: #f44336; }
        .section { margin: 20px 0; }
        .metric { display: flex; justify-content: between; padding: 8px 0; border-bottom: 1px solid #eee; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
        .error-item { background: #ffebee; padding: 15px; margin: 10px 0; border-left: 4px solid #f44336; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔧 Warp Web Navigator</h1>
          <h2>Diagnostics Report</h2>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="section">
          <h3>System Overview</h3>
          <div class="metric">
            <span>Overall Health:</span>
            <span class="${reportData.overall.healthy ? 'status-good' : 'status-error'}">
              ${reportData.overall.healthy ? '✓ Healthy' : '✗ Issues Detected'}
            </span>
          </div>
          <div class="metric">
            <span>Uptime:</span>
            <span>${this.formatDuration(reportData.overall.uptime)}</span>
          </div>
          <div class="metric">
            <span>Last Health Check:</span>
            <span>${new Date(reportData.overall.lastCheck).toLocaleString()}</span>
          </div>
        </div>

        <div class="section">
          <h3>Component Status</h3>
          <table>
            <thead>
              <tr><th>Component</th><th>Status</th><th>Last Check</th><th>Details</th></tr>
            </thead>
            <tbody>
              ${Object.entries(reportData.components).map(([name, info]) => `
                <tr>
                  <td>${name}</td>
                  <td class="${info.healthy ? 'status-good' : 'status-error'}">
                    ${info.healthy ? '✓ OK' : '✗ Error'}
                  </td>
                  <td>${info.lastCheck ? new Date(info.lastCheck).toLocaleString() : 'Never'}</td>
                  <td>${info.details || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h3>Performance Metrics</h3>
          <div class="metric">
            <span>Memory Usage:</span>
            <span>${this.formatBytes(reportData.performance.memory.usedJSHeapSize)} / ${this.formatBytes(reportData.performance.memory.jsHeapSizeLimit)}</span>
          </div>
          <div class="metric">
            <span>Success Rate:</span>
            <span class="${reportData.performance.successRate > 95 ? 'status-good' : reportData.performance.successRate > 80 ? 'status-warning' : 'status-error'}">
              ${reportData.performance.successRate}%
            </span>
          </div>
          <div class="metric">
            <span>Total Operations:</span>
            <span>${reportData.performance.totalOperations}</span>
          </div>
        </div>

        ${reportData.errors.length > 0 ? `
        <div class="section">
          <h3>Recent Errors (${reportData.errors.length})</h3>
          ${reportData.errors.map(error => `
            <div class="error-item">
              <strong>${error.type}</strong> - ${new Date(error.timestamp).toLocaleString()}<br>
              <em>${error.message}</em>
            </div>
          `).join('')}
        </div>
        ` : '<div class="section"><h3>✅ No Recent Errors</h3></div>'}

        <div class="section">
          <h3>Recommendations</h3>
          <ul>
            ${reportData.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  destroy() {
    this.stopAutoRefresh();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

// Export for use in popup
window.PopupDiagnostics = PopupDiagnostics;
