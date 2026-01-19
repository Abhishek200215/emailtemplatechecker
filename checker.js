class EmailTemplateChecker {
  constructor() {
    this.rulesEngine = new EmailRulesEngine();
    this.currentResults = [];
    this.lastAnalysisTime = 0;
    this.debounceTimer = null;
    
    // Load saved settings
    this.settings = this.loadSettings();
    
    // Initialize event listeners
    this.initEventListeners();
    this.setupRealTimeAnalysis();
    
    // Initialize preview
    this.initPreview();
  }

  initPreview() {
    const previewFrame = document.getElementById('previewFrame');
    const placeholder = document.getElementById('previewPlaceholder');
    
    if (previewFrame) {
      // Set initial content
      previewFrame.srcdoc = this.getEmptyPreview();
      previewFrame.style.display = 'block';
    }
    
    if (placeholder) {
      placeholder.style.display = 'flex';
    }
  }

  getEmptyPreview() {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { 
      margin: 0; 
      padding: 40px 20px; 
      font-family: Arial, sans-serif; 
      background-color: #f5f5f5;
      color: #666;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .empty-preview {
      max-width: 400px;
    }
    .empty-preview i {
      font-size: 64px;
      margin-bottom: 20px;
      opacity: 0.3;
      color: #999;
    }
    .empty-preview h3 {
      margin: 0 0 10px 0;
      color: #555;
    }
    .empty-preview p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="empty-preview">
    <i class="fas fa-envelope"></i>
    <h3>No Email Preview</h3>
    <p>Paste your HTML email code to see a live preview here.</p>
    <p style="margin-top: 10px; font-size: 12px; color: #888;">
      The preview will update automatically as you type.
    </p>
  </div>
  <script src="https://kit.fontawesome.com/a076d05399.js"></script>
</body>
</html>`;
  }

  loadSettings() {
    const defaultSettings = {
      realtimeCheck: true,
      autoFormat: true,
      autoPreview: true,
      errorThreshold: 10,
      warningThreshold: 5,
      theme: 'dark'
    };

    try {
      const saved = localStorage.getItem('emailCheckerSettings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch (e) {
      return defaultSettings;
    }
  }

  saveSettings() {
    localStorage.setItem('emailCheckerSettings', JSON.stringify(this.settings));
  }

  parseHTML(html) {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }

  formatHTML(html) {
    // Simple HTML formatter
    let formatted = html;
    let indent = 0;
    const lines = html.split(/>\s*</);
    
    if (lines.length > 1) {
      formatted = lines.map((line, i) => {
        if (i === 0) return line;
        if (i === lines.length - 1) return '  '.repeat(indent) + line;
        
        if (line.match(/^\/[a-z]/i)) {
          indent--;
        }
        
        const result = '  '.repeat(indent) + '<' + line + '>';
        
        if (line.match(/^[^\/][a-z].*[^\/]$/i) && !line.match(/^(img|br|hr|meta|link|input)/i)) {
          indent++;
        }
        
        return result;
      }).join('\n');
    }
    
    return formatted;
  }

  runChecks(htmlString) {
    const startTime = performance.now();
    const rules = this.rulesEngine.getAllRules();
    const results = [];
    let passedCount = 0;

    rules.forEach(rule => {
      try {
        const passed = rule.test(htmlString);
        if (passed) passedCount++;
        
        results.push({
          id: rule.id,
          rule: rule,
          passed: passed,
          message: typeof rule.message === 'function' ? rule.message(passed, htmlString) : rule.message,
          level: rule.level,
          weight: rule.weight,
          category: rule.category,
          fix: rule.fix,
          hasAutoFix: !!rule.autoFix
        });
      } catch (error) {
        console.error(`Error running rule ${rule.id}:`, error);
      }
    });

    const score = this.calculateScore(results);
    const categoryScores = this.rulesEngine.calculateCategoryScores(results);
    this.lastAnalysisTime = performance.now() - startTime;

    return {
      score,
      passedCount,
      totalChecks: rules.length,
      results,
      categoryScores,
      analysisTime: this.lastAnalysisTime
    };
  }

  calculateScore(results) {
    let maxScore = 100;
    let lostScore = 0;

    results.forEach(result => {
      if (!result.passed) {
        // Weighted penalty based on severity
        const penalty = result.weight * this.getSeverityMultiplier(result.level);
        lostScore += penalty;
      }
    });

    const score = Math.max(0, Math.round(maxScore - lostScore));
    return score;
  }

  getSeverityMultiplier(level) {
    switch (level) {
      case 'error': return 0.8;
      case 'warning': return 0.5;
      case 'info': return 0.2;
      default: return 0.3;
    }
  }

  getGrade(score) {
    if (score >= 95) return { grade: 'A+', color: '#10b981' };
    if (score >= 90) return { grade: 'A', color: '#10b981' };
    if (score >= 85) return { grade: 'A-', color: '#10b981' };
    if (score >= 80) return { grade: 'B+', color: '#3b82f6' };
    if (score >= 75) return { grade: 'B', color: '#3b82f6' };
    if (score >= 70) return { grade: 'B-', color: '#3b82f6' };
    if (score >= 65) return { grade: 'C+', color: '#f59e0b' };
    if (score >= 60) return { grade: 'C', color: '#f59e0b' };
    if (score >= 55) return { grade: 'C-', color: '#f59e0b' };
    if (score >= 50) return { grade: 'D+', color: '#ef4444' };
    if (score >= 45) return { grade: 'D', color: '#ef4444' };
    if (score >= 40) return { grade: 'D-', color: '#ef4444' };
    return { grade: 'F', color: '#dc2626' };
  }

  generateQuickFixes(results) {
    const fixes = [];
    const categories = {};

    results.filter(r => !r.passed).forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = [];
      }
      categories[result.category].push(result);
    });

    Object.entries(categories).forEach(([category, issues]) => {
      if (issues.length > 0) {
        fixes.push({
          category,
          issues,
          priority: issues.some(i => i.level === 'error') ? 'high' : 
                   issues.some(i => i.level === 'warning') ? 'medium' : 'low'
        });
      }
    });

    return fixes.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  applyAutoFix(ruleId, html) {
    const rule = this.rulesEngine.getRule(ruleId);
    if (rule && rule.autoFix) {
      return rule.autoFix(html);
    }
    return html;
  }

  // UI Update Methods
  updateScoreDisplay(score) {
    const scoreElement = document.getElementById('score');
    const gradeElement = document.getElementById('grade');
    const progressCircle = document.querySelector('.score-progress');
    
    if (scoreElement) scoreElement.textContent = score;
    
    const grade = this.getGrade(score);
    if (gradeElement) {
      gradeElement.textContent = `Grade: ${grade.grade}`;
      gradeElement.style.color = grade.color;
    }
    
    if (progressCircle) {
      const circumference = 2 * Math.PI * 54;
      const offset = circumference - (score / 100) * circumference;
      progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
      progressCircle.style.strokeDashoffset = offset;
      progressCircle.style.stroke = grade.color;
    }
  }

  updateIssueCounts(results) {
    const errorCount = results.filter(r => !r.passed && r.level === 'error').length;
    const warningCount = results.filter(r => !r.passed && r.level === 'warning').length;
    const infoCount = results.filter(r => !r.passed && r.level === 'info').length;
    const passedCount = results.filter(r => r.passed).length;

    const errorElement = document.getElementById('errorCount');
    const warningElement = document.getElementById('warningCount');
    const infoElement = document.getElementById('infoCount');
    const passedElement = document.getElementById('passedCount');
    
    if (errorElement) errorElement.textContent = errorCount;
    if (warningElement) warningElement.textContent = warningCount;
    if (infoElement) infoElement.textContent = infoCount;
    if (passedElement) passedElement.textContent = passedCount;
  }

  updateCategories(categoryScores) {
    const container = document.getElementById('categories');
    if (!container) return;

    container.innerHTML = '';

    Object.entries(categoryScores).forEach(([categoryId, data]) => {
      const category = this.rulesEngine.categories[categoryId];
      if (!category) return;

      const percentage = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 100;
      
      const item = document.createElement('div');
      item.className = 'category-item';
      item.innerHTML = `
        <div class="category-header">
          <span class="category-name">${category.name}</span>
          <span class="category-score">${percentage}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%; background: ${category.color};"></div>
        </div>
      `;
      container.appendChild(item);
    });
  }

  updateIssuesList(results, filter = 'all') {
    const container = document.getElementById('issues');
    if (!container) return;

    const filteredResults = results.filter(result => {
      if (filter === 'all') return !result.passed;
      if (filter === 'passed') return result.passed;
      return !result.passed && result.level === filter;
    });

    if (filteredResults.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>${filter === 'all' ? 'No issues found!' : 'No items match the filter'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    filteredResults.forEach(result => {
      const item = this.createIssueElement(result);
      container.appendChild(item);
    });
  }

  createIssueElement(result) {
    const item = document.createElement('div');
    item.className = `issue-item ${result.level}`;
    
    const severityColors = {
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#06b6d4'
    };

    item.innerHTML = `
      <div class="issue-header">
        <div class="issue-message">${result.message}</div>
        <span class="issue-severity">${result.level}</span>
      </div>
      <div class="issue-details">
        <strong>Category:</strong> ${this.rulesEngine.categories[result.category]?.name || result.category}
        <span style="margin-left: 15px;"><strong>Weight:</strong> ${result.weight}pts</span>
      </div>
      ${result.fix ? `
        <div class="issue-fix">
          <div class="fix-header">
            <strong>Fix:</strong>
            ${result.hasAutoFix ? `<button class="fix-btn" data-rule="${result.id}">Apply Fix</button>` : ''}
          </div>
          <pre>${result.fix}</pre>
        </div>
      ` : ''}
    `;

    // Add event listener for auto-fix button
    if (result.hasAutoFix) {
      const fixBtn = item.querySelector('.fix-btn');
      fixBtn.addEventListener('click', () => this.handleAutoFix(result.id));
    }

    return item;
  }

  updateQuickFixes(results) {
    const container = document.getElementById('quickFixes');
    if (!container) return;

    const fixes = this.generateQuickFixes(results);

    if (fixes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-wrench"></i>
          <p>No fixes needed</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    fixes.forEach(fix => {
      const category = this.rulesEngine.categories[fix.category];
      const item = document.createElement('div');
      item.className = 'quick-fix-item';
      
      const issueCounts = {
        error: fix.issues.filter(i => i.level === 'error').length,
        warning: fix.issues.filter(i => i.level === 'warning').length,
        info: fix.issues.filter(i => i.level === 'info').length
      };

      item.innerHTML = `
        <div class="fix-title" style="color: ${category.color}">
          <i class="fas fa-${fix.priority === 'high' ? 'exclamation-triangle' : 
                            fix.priority === 'medium' ? 'exclamation-circle' : 'info-circle'}"></i>
          ${category.name} Issues
        </div>
        <div class="fix-description">
          ${fix.issues.length} issue${fix.issues.length > 1 ? 's' : ''} found
          ${issueCounts.error ? ` · ${issueCounts.error} error${issueCounts.error > 1 ? 's' : ''}` : ''}
          ${issueCounts.warning ? ` · ${issueCounts.warning} warning${issueCounts.warning > 1 ? 's' : ''}` : ''}
          ${issueCounts.info ? ` · ${issueCounts.info} info` : ''}
        </div>
        <div class="fix-action">
          ${fix.issues.some(i => i.hasAutoFix) ? 
            `<button class="btn-secondary" onclick="checker.applyAllFixes('${fix.category}')">
              <i class="fas fa-bolt"></i> Fix All
            </button>` : ''}
          <button class="btn-secondary" onclick="checker.showCategoryDetails('${fix.category}')">
            <i class="fas fa-list"></i> View Details
          </button>
        </div>
      `;
      container.appendChild(item);
    });
  }

  updatePreview(html) {
    const previewFrame = document.getElementById('previewFrame');
    const placeholder = document.getElementById('previewPlaceholder');
    
    if (!previewFrame || !placeholder) return;

    // Always show the iframe
    previewFrame.style.display = 'block';
    
    if (!html || html.trim().length < 10) {
      // Show empty preview
      previewFrame.srcdoc = this.getEmptyPreview();
      placeholder.style.display = 'flex';
      return;
    }

    try {
      // Create a sanitized version for preview
      const previewHtml = this.createPreviewHTML(html);
      
      // Hide placeholder
      placeholder.style.display = 'none';
      
      // Update iframe
      previewFrame.srcdoc = previewHtml;
      
    } catch (error) {
      console.error('Error updating preview:', error);
      placeholder.style.display = 'flex';
    }
  }

  createPreviewHTML(html) {
    // Clean and wrap the HTML for preview
    const cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: Arial, sans-serif; 
      background-color: #f5f5f5;
      color: #333;
    }
    img { 
      max-width: 100%; 
      height: auto; 
      display: block;
    }
    table { 
      max-width: 100%; 
      border-collapse: collapse;
    }
    td { 
      padding: 10px; 
      vertical-align: top;
    }
    a { 
      color: #0066cc; 
      text-decoration: underline;
    }
    .preview-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .preview-footer {
      text-align: center;
      margin-top: 20px;
      color: #666;
      font-size: 12px;
      padding: 10px;
    }
  </style>
</head>
<body>
  <div class="preview-wrapper">
    ${cleanHtml}
  </div>
  <div class="preview-footer">
    Email Preview • Generated by Email Template Checker
  </div>
</body>
</html>`;
  }

  updateLastChecked() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString();
    
    const lastCheckedElement = document.getElementById('lastChecked');
    const analysisTimeElement = document.getElementById('analysisTime');
    
    if (lastCheckedElement) lastCheckedElement.textContent = `${dateString} ${timeString}`;
    if (analysisTimeElement) analysisTimeElement.textContent = `${Math.round(this.lastAnalysisTime)}ms`;
  }

  // Event Handlers
  handleAutoFix(ruleId) {
    const textarea = document.getElementById('emailHtml');
    if (!textarea) return;

    const currentHtml = textarea.value;
    const fixedHtml = this.applyAutoFix(ruleId, currentHtml);
    
    if (fixedHtml !== currentHtml) {
      textarea.value = fixedHtml;
      this.analyzeContent();
      this.showNotification('Fix applied successfully!', 'success');
    }
  }

  applyAllFixes(category) {
    const textarea = document.getElementById('emailHtml');
    if (!textarea) return;

    let currentHtml = textarea.value;
    let fixedCount = 0;
    
    const rules = this.rulesEngine.getAllRules();
    rules.forEach(rule => {
      if (rule.category === category && rule.autoFix) {
        const newHtml = rule.autoFix(currentHtml);
        if (newHtml !== currentHtml) {
          currentHtml = newHtml;
          fixedCount++;
        }
      }
    });

    if (fixedCount > 0) {
      textarea.value = currentHtml;
      this.analyzeContent();
      this.showNotification(`Applied ${fixedCount} fixes for ${category}`, 'success');
    }
  }

  showCategoryDetails(category) {
    const modal = document.getElementById('reportModal');
    const content = document.getElementById('reportContent');
    
    if (!modal || !content) return;

    const categoryInfo = this.rulesEngine.categories[category];
    const categoryRules = this.rulesEngine.getAllRules().filter(r => r.category === category);
    
    let html = `
      <h3 style="color: ${categoryInfo.color}">${categoryInfo.name}</h3>
      <p>${categoryInfo.weight}% of total score</p>
      
      <div class="category-rules" style="margin-top: 20px;">
    `;

    categoryRules.forEach(rule => {
      const result = this.currentResults.find(r => r.id === rule.id);
      html += `
        <div class="rule-card ${result && !result.passed ? 'failed' : 'passed'}">
          <h4>${rule.description}</h4>
          <p><strong>Severity:</strong> <span class="severity ${rule.level}">${rule.level}</span></p>
          <p><strong>Weight:</strong> ${rule.weight} points</p>
          ${result && !result.passed ? `<pre class="fix-code">${rule.fix}</pre>` : ''}
        </div>
      `;
    });

    html += '</div>';
    content.innerHTML = html;
    modal.style.display = 'block';
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : 
                         type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      ${message}
    `;

    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--dark-card);
          border: 1px solid var(--dark-border);
          border-radius: var(--radius);
          padding: 15px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 9999;
          transform: translateX(400px);
          transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          max-width: 350px;
          box-shadow: var(--shadow);
        }
        
        .notification.show {
          transform: translateX(0);
        }
        
        .notification.success {
          border-left: 4px solid var(--success);
        }
        
        .notification.error {
          border-left: 4px solid var(--error);
        }
        
        .notification.info {
          border-left: 4px solid var(--info);
        }
        
        .notification i {
          font-size: 1.2rem;
        }
        
        .notification.success i {
          color: var(--success);
        }
        
        .notification.error i {
          color: var(--error);
        }
        
        .notification.info i {
          color: var(--info);
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Show and auto-remove
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Initialization
  initEventListeners() {
    // Format button
    document.getElementById('formatBtn')?.addEventListener('click', () => {
      const textarea = document.getElementById('emailHtml');
      if (textarea) {
        textarea.value = this.formatHTML(textarea.value);
        this.analyzeContent();
      }
    });

    // Clear button
    document.getElementById('clearBtn')?.addEventListener('click', () => {
      const textarea = document.getElementById('emailHtml');
      if (textarea) {
        textarea.value = '';
        this.analyzeContent();
      }
    });

    // Sample button
    document.getElementById('sampleBtn')?.addEventListener('click', () => {
      const sampleHTML = this.getSampleHTML();
      document.getElementById('emailHtml').value = sampleHTML;
      this.analyzeContent();
    });

    // Import button
    document.getElementById('importBtn')?.addEventListener('click', () => {
      this.importHTMLFile();
    });

    // Check button
    document.getElementById('checkBtn')?.addEventListener('click', () => {
      this.analyzeContent();
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const filter = e.target.dataset.filter;
        this.updateIssuesList(this.currentResults, filter);
      });
    });

    // Preview mode buttons
    document.querySelectorAll('.preview-mode').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.preview-mode').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.updatePreviewMode(e.target.dataset.mode);
      });
    });

    // Export button
    document.getElementById('exportBtn')?.addEventListener('click', () => {
      this.exportReport();
    });

    // Settings button
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
      this.openSettings();
    });

    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.modal').style.display = 'none';
      });
    });

    // Click outside modal to close
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
      }
    });

    // Character count
    const textarea = document.getElementById('emailHtml');
    if (textarea) {
      textarea.addEventListener('input', () => {
        document.getElementById('charCount').textContent = textarea.value.length;
      });
    }
  }

  setupRealTimeAnalysis() {
    const textarea = document.getElementById('emailHtml');
    if (!textarea) return;

    textarea.addEventListener('input', () => {
      if (!this.settings.realtimeCheck) return;

      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.analyzeContent();
        
        if (this.settings.autoPreview) {
          this.updatePreview(textarea.value);
        }
      }, 500); // 500ms debounce
    });
  }

  analyzeContent() {
    const textarea = document.getElementById('emailHtml');
    if (!textarea) return;

    const html = textarea.value.trim();
    
    if (!html) {
      this.resetDisplay();
      return;
    }

    // Run checks directly on the HTML string (not parsed DOM)
    const result = this.runChecks(html);
    
    this.currentResults = result.results;
    
    // Update UI
    this.updateScoreDisplay(result.score);
    this.updateIssueCounts(result.results);
    this.updateCategories(result.categoryScores);
    this.updateIssuesList(result.results, 'all');
    this.updateQuickFixes(result.results);
    this.updateLastChecked();
    
    // Update preview if auto-preview is enabled
    if (this.settings.autoPreview) {
      this.updatePreview(html);
    }
  }

  resetDisplay() {
    this.updateScoreDisplay(0);
    
    const errorElement = document.getElementById('errorCount');
    const warningElement = document.getElementById('warningCount');
    const infoElement = document.getElementById('infoCount');
    const passedElement = document.getElementById('passedCount');
    
    if (errorElement) errorElement.textContent = '0';
    if (warningElement) warningElement.textContent = '0';
    if (infoElement) infoElement.textContent = '0';
    if (passedElement) passedElement.textContent = '0';
    
    const categoriesElement = document.getElementById('categories');
    const issuesElement = document.getElementById('issues');
    const quickFixesElement = document.getElementById('quickFixes');
    const lastCheckedElement = document.getElementById('lastChecked');
    const analysisTimeElement = document.getElementById('analysisTime');
    
    if (categoriesElement) categoriesElement.innerHTML = '';
    if (issuesElement) issuesElement.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-check-circle"></i>
        <p>No issues found. Your HTML looks good!</p>
      </div>
    `;
    if (quickFixesElement) quickFixesElement.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-wrench"></i>
        <p>No fixes needed</p>
      </div>
    `;
    if (lastCheckedElement) lastCheckedElement.textContent = 'Never';
    if (analysisTimeElement) analysisTimeElement.textContent = '0ms';
    
    // Reset preview
    this.updatePreview('');
  }

  updatePreviewMode(mode) {
    const previewFrame = document.getElementById('previewFrame');
    if (!previewFrame) return;

    const container = previewFrame.parentElement;
    switch (mode) {
      case 'mobile':
        container.style.maxWidth = '375px';
        container.style.margin = '0 auto';
        previewFrame.style.width = '375px';
        break;
      case 'outlook':
        container.style.maxWidth = '600px';
        container.style.margin = '0 auto';
        previewFrame.style.width = '600px';
        break;
      default: // desktop
        container.style.maxWidth = '100%';
        container.style.margin = '0';
        previewFrame.style.width = '100%';
    }
  }

  getSampleHTML() {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!--[if mso]>
  <style type="text/css">
    body { font-family: Arial, sans-serif !important; }
    .outlook-fix { display: none !important; }
  </style>
<![endif]-->
</head>
<body style="margin:0; padding:20px; background:#f3f4f6;">
  
  <!-- Hidden preheader text -->
  <div style="display:none; font-size:0; line-height:0; height:0; opacity:0;">
    Check out our latest newsletter with exciting updates and offers!
  </div>
  
  <!-- Main container table -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" 
         style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding-bottom:30px;">
              <h1 style="font-family:Arial,sans-serif; font-size:28px; color:#1e293b; margin:0;">
                Welcome to Our Newsletter
              </h1>
              <p style="font-family:Arial,sans-serif; font-size:16px; color:#64748b; margin:15px 0 0 0;">
                Monthly updates and exclusive offers
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Hero Image -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding-bottom:30px;">
              <img src="https://via.placeholder.com/600x300/3b82f6/ffffff?text=Newsletter+Hero" 
                   alt="Newsletter banner image showing exciting content"
                   width="600" height="300" 
                   style="display:block; max-width:100%; height:auto; border-radius:6px;">
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-family:Arial,sans-serif; font-size:16px; line-height:1.6; color:#334155;">
              <p style="margin:0 0 20px 0;">
                Hello there! We're excited to share our latest updates with you. 
                This month we have some amazing new features and special offers.
              </p>
              
              <p style="margin:0 0 30px 0;">
                Don't miss out on our limited-time promotions and valuable insights 
                that can help you get the most out of our services.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="https://example.com/offer" 
                       style="display:inline-block; background:#3b82f6; color:#ffffff; 
                              text-decoration:none; font-family:Arial,sans-serif; font-size:16px; 
                              font-weight:bold; padding:12px 30px; border-radius:6px;">
                      Claim Your Offer
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:40px;">
          <tr>
            <td align="center" style="padding-top:30px; border-top:1px solid #e2e8f0;">
              <p style="font-family:Arial,sans-serif; font-size:14px; color:#64748b; margin:0 0 10px 0;">
                You received this email because you subscribed to our newsletter.
              </p>
              <p style="font-family:Arial,sans-serif; font-size:14px; color:#64748b; margin:0;">
                <a href="https://example.com/unsubscribe" 
                   style="color:#3b82f6; text-decoration:underline;">
                  Unsubscribe
                </a> | 
                <a href="https://example.com/preferences" 
                   style="color:#3b82f6; text-decoration:underline;">
                  Preferences
                </a>
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
  
  <!-- Outlook specific fix -->
  <!--[if mso]>
  <div style="display:none; font-size:0; line-height:0; height:0; width:0;">
    &nbsp;
  </div>
<![endif]-->
  
</body>
</html>`;
  }

  importHTMLFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.html,.htm,.txt';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        document.getElementById('emailHtml').value = event.target.result;
        this.analyzeContent();
        this.showNotification('File imported successfully!', 'success');
      };
      reader.readAsText(file);
    };
    
    input.click();
  }

  exportReport() {
    const textarea = document.getElementById('emailHtml');
    const html = textarea ? textarea.value : '';
    const report = {
      html: html,
      analysis: {
        score: this.currentResults.reduce((acc, r) => acc + (r.passed ? r.weight : 0), 0),
        totalScore: this.currentResults.reduce((acc, r) => acc + r.weight, 0),
        results: this.currentResults,
        timestamp: new Date().toISOString(),
        analysisTime: this.lastAnalysisTime
      }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-analysis-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showNotification('Report exported successfully!', 'success');
  }

  openSettings() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    
    // Load current settings into form
    document.getElementById('realtimeCheck').checked = this.settings.realtimeCheck;
    document.getElementById('autoFormat').checked = this.settings.autoFormat;
    document.getElementById('autoPreview').checked = this.settings.autoPreview;
    document.getElementById('errorThreshold').value = this.settings.errorThreshold;
    document.getElementById('warningThreshold').value = this.settings.warningThreshold;
    document.getElementById('errorValue').textContent = this.settings.errorThreshold;
    document.getElementById('warningValue').textContent = this.settings.warningThreshold;
    
    // Update threshold value displays
    document.getElementById('errorThreshold').addEventListener('input', (e) => {
      document.getElementById('errorValue').textContent = e.target.value;
    });
    
    document.getElementById('warningThreshold').addEventListener('input', (e) => {
      document.getElementById('warningValue').textContent = e.target.value;
    });
    
    // Set active theme button
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.theme === this.settings.theme) {
        btn.classList.add('active');
      }
    });
    
    // Theme button handlers
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    
    // Save button
    document.getElementById('saveSettings').onclick = () => {
      this.settings.realtimeCheck = document.getElementById('realtimeCheck').checked;
      this.settings.autoFormat = document.getElementById('autoFormat').checked;
      this.settings.autoPreview = document.getElementById('autoPreview').checked;
      this.settings.errorThreshold = parseInt(document.getElementById('errorThreshold').value);
      this.settings.warningThreshold = parseInt(document.getElementById('warningThreshold').value);
      
      const activeThemeBtn = document.querySelector('.theme-btn.active');
      if (activeThemeBtn) {
        this.settings.theme = activeThemeBtn.dataset.theme;
        this.applyTheme(this.settings.theme);
      }
      
      this.saveSettings();
      modal.style.display = 'none';
      this.showNotification('Settings saved successfully!', 'success');
    };
    
    // Reset button
    document.getElementById('resetSettings').onclick = () => {
      if (confirm('Reset all settings to default?')) {
        localStorage.removeItem('emailCheckerSettings');
        this.settings = this.loadSettings();
        modal.style.display = 'none';
        this.showNotification('Settings reset to default!', 'info');
      }
    };
    
    modal.style.display = 'block';
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('emailCheckerTheme', theme);
  }

  loadTheme() {
    const savedTheme = localStorage.getItem('emailCheckerTheme') || 'dark';
    this.applyTheme(savedTheme);
  }
}

// Initialize the application
let checker;

document.addEventListener('DOMContentLoaded', () => {
  checker = new EmailTemplateChecker();
  checker.loadTheme();
  
  // Add theme styles
  const themeStyles = document.createElement('style');
  themeStyles.textContent = `
    [data-theme="light"] {
      --dark-bg: #ffffff;
      --dark-card: #f8fafc;
      --dark-border: #e2e8f0;
      --dark-text: #1e293b;
      --dark-muted: #64748b;
      --primary: #3b82f6;
      --primary-dark: #2563eb;
    }
    
    [data-theme="blue"] {
      --dark-bg: #0c4a6e;
      --dark-card: #075985;
      --dark-border: #0369a1;
      --dark-text: #f0f9ff;
      --dark-muted: #7dd3fc;
      --primary: #38bdf8;
      --primary-dark: #0ea5e9;
    }
  `;
  document.head.appendChild(themeStyles);
  
  // Load sample HTML on first visit
  if (!localStorage.getItem('emailCheckerFirstVisit')) {
    setTimeout(() => {
      const sampleBtn = document.getElementById('sampleBtn');
      if (sampleBtn) {
        sampleBtn.click();
      }
    }, 1000);
    localStorage.setItem('emailCheckerFirstVisit', 'true');
  }
  
  // Add character count on load
  const textarea = document.getElementById('emailHtml');
  if (textarea) {
    document.getElementById('charCount').textContent = textarea.value.length;
  }
  
  // Auto-save draft
  let autoSaveTimer;
  textarea.addEventListener('input', () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      const html = textarea.value;
      if (html.trim()) {
        localStorage.setItem('emailCheckerDraft', html);
      }
    }, 2000);
  });
  
  // Load draft on page load
  window.addEventListener('load', () => {
    const savedDraft = localStorage.getItem('emailCheckerDraft');
    if (savedDraft) {
      textarea.value = savedDraft;
      setTimeout(() => checker.analyzeContent(), 500);
    }
  });
});