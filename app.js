// Additional UI enhancements and utilities

// Notification styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
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

document.head.appendChild(notificationStyles);

// Theme styles
const themeStyles = document.createElement('style');
themeStyles.textContent = `
  [data-theme="light"] {
    --dark-bg: #ffffff;
    --dark-card: #f8fafc;
    --dark-border: #e2e8f0;
    --dark-text: #1e293b;
    --dark-muted: #64748b;
  }
  
  [data-theme="blue"] {
    --dark-bg: #0c4a6e;
    --dark-card: #075985;
    --dark-border: #0369a1;
    --dark-text: #f0f9ff;
    --dark-muted: #7dd3fc;
  }
`;

document.head.appendChild(themeStyles);

// Tooltips
const tooltipStyles = document.createElement('style');
tooltipStyles.textContent = `
  [data-tooltip] {
    position: relative;
  }
  
  [data-tooltip]:before {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: var(--dark-card);
    color: var(--dark-text);
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 0.85rem;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease;
    border: 1px solid var(--dark-border);
    z-index: 1000;
  }
  
  [data-tooltip]:hover:before {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(-5px);
  }
`;

document.head.appendChild(tooltipStyles);

// Add tooltips to toolbar buttons
document.addEventListener('DOMContentLoaded', () => {
  const tooltips = {
    formatBtn: 'Format HTML code',
    clearBtn: 'Clear editor',
    sampleBtn: 'Load sample HTML',
    importBtn: 'Import HTML file',
    exportBtn: 'Export full report',
    shareBtn: 'Share analysis',
    settingsBtn: 'Settings'
  };
  
  Object.entries(tooltips).forEach(([id, text]) => {
    const element = document.getElementById(id);
    if (element) {
      element.setAttribute('data-tooltip', text);
    }
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Enter to check
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('checkBtn')?.click();
  }
  
  // Ctrl/Cmd + F to format
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    document.getElementById('formatBtn')?.click();
  }
  
  // Ctrl/Cmd + L to clear
  if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
    e.preventDefault();
    document.getElementById('clearBtn')?.click();
  }
  
  // Ctrl/Cmd + S to save/export
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    document.getElementById('exportBtn')?.click();
  }
});

// Auto-save draft
let autoSaveTimer;
document.getElementById('emailHtml')?.addEventListener('input', () => {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const html = document.getElementById('emailHtml').value;
    if (html.trim()) {
      localStorage.setItem('emailCheckerDraft', html);
    }
  }, 2000);
});

// Load draft on page load
window.addEventListener('load', () => {
  const savedDraft = localStorage.getItem('emailCheckerDraft');
  if (savedDraft) {
    document.getElementById('emailHtml').value = savedDraft;
    setTimeout(() => checker?.analyzeContent(), 500);
  }
});

// Copy to clipboard functionality
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = '<i class="fas fa-check-circle"></i> Copied to clipboard!';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      }, 2000);
    }, 10);
  });
}

// Add copy buttons to code snippets
document.addEventListener('click', (e) => {
  if (e.target.closest('.issue-fix pre')) {
    const code = e.target.closest('.issue-fix pre').textContent;
    copyToClipboard(code);
  }
});

// Performance monitoring
const performanceMonitor = {
  startTime: null,
  start() {
    this.startTime = performance.now();
  },
  end(label) {
    if (this.startTime) {
      const duration = performance.now() - this.startTime;
      console.log(`${label}: ${duration.toFixed(2)}ms`);
      this.startTime = null;
    }
  }
};

// Initialize performance monitoring for analysis
const originalAnalyzeContent = checker?.analyzeContent;
if (originalAnalyzeContent) {
  checker.analyzeContent = function() {
    performanceMonitor.start();
    const result = originalAnalyzeContent.call(this);
    performanceMonitor.end('Analysis');
    return result;
  };
}

// Responsive adjustments
function handleResize() {
  const dashboard = document.querySelector('.dashboard');
  const issuesList = document.getElementById('issues');
  
  if (window.innerWidth < 768) {
    if (dashboard) {
      dashboard.style.gridTemplateColumns = '1fr';
    }
    if (issuesList) {
      issuesList.style.maxHeight = '300px';
    }
  } else {
    if (dashboard) {
      dashboard.style.gridTemplateColumns = '1fr 1fr';
    }
    if (issuesList) {
      issuesList.style.maxHeight = '400px';
    }
  }
}

window.addEventListener('resize', handleResize);
window.addEventListener('load', handleResize);

// Print functionality
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault();
    window.print();
  }
});

// Add print styles
const printStyles = document.createElement('style');
printStyles.textContent = `
  @media print {
    .toolbar, .footer-actions, .filter-buttons, .preview-toolbar,
    .fix-btn, .btn-secondary, .modal, .notification {
      display: none !important;
    }
    
    body {
      background: white !important;
      color: black !important;
    }
    
    .container {
      max-width: 100% !important;
      margin: 0 !important;
      padding: 20px !important;
    }
    
    .dashboard {
      grid-template-columns: 1fr !important;
    }
    
    .preview-section {
      page-break-before: always;
    }
    
    .issue-fix {
      border: 1px solid #ccc !important;
    }
  }
`;

document.head.appendChild(printStyles);