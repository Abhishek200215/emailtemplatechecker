// Email Template Rules Engine
class EmailRulesEngine {
  constructor() {
    this.rules = this.initializeRules();
    this.categories = {
      compatibility: { name: 'Compatibility', weight: 35, color: '#3b82f6' },
      accessibility: { name: 'Accessibility', weight: 25, color: '#10b981' },
      performance: { name: 'Performance', weight: 20, color: '#8b5cf6' },
      security: { name: 'Security', weight: 10, color: '#ef4444' },
      bestPractice: { name: 'Best Practices', weight: 10, color: '#f59e0b' }
    };
  }

  initializeRules() {
    return {
      // COMPATIBILITY RULES
      doctypeRequired: {
        id: 'doctype-required',
        category: 'compatibility',
        weight: 10,
        level: 'error',
        description: 'DOCTYPE declaration required',
        test: (htmlString) => {
          return htmlString.includes('<!DOCTYPE') || htmlString.includes('<!doctype');
        },
        message: (passed) => passed 
          ? 'DOCTYPE declaration found ✓' 
          : 'Missing DOCTYPE declaration. Add <!DOCTYPE html> at the top',
        fix: 'Add <!DOCTYPE html> at the very beginning of your HTML',
        autoFix: (html) => {
          if (!html.includes('<!DOCTYPE') && !html.includes('<!doctype')) {
            return '<!DOCTYPE html>\n' + html;
          }
          return html;
        }
      },

      htmlTagRequired: {
        id: 'html-tag-required',
        category: 'compatibility',
        weight: 8,
        level: 'error',
        description: 'HTML tag required',
        test: (htmlString) => {
          return htmlString.includes('<html') && htmlString.includes('</html>');
        },
        message: (passed) => passed 
          ? 'HTML tags found ✓' 
          : 'Missing <html> tags. Wrap your content in <html> tags',
        fix: 'Wrap your content in <html> tags: <html>...</html>',
        autoFix: (html) => {
          if (!html.includes('<html') || !html.includes('</html>')) {
            return '<html>\n' + html + '\n</html>';
          }
          return html;
        }
      },

      tableLayout: {
        id: 'table-layout',
        category: 'compatibility',
        weight: 15,
        level: 'error',
        description: 'Table-based layout required for email clients',
        test: (htmlString) => {
          // Check if there are tables (excluding potential nested tables in complex HTML)
          const tableMatch = htmlString.match(/<table[^>]*>/gi);
          return tableMatch && tableMatch.length > 0;
        },
        message: (passed, htmlString) => {
          const tableMatch = htmlString.match(/<table[^>]*>/gi);
          const tableCount = tableMatch ? tableMatch.length : 0;
          return passed 
            ? `Table-based layout found (${tableCount} tables) ✓` 
            : 'No table-based layout found. Email layouts must use tables for compatibility';
        },
        fix: `Wrap your layout in a table structure:
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center">
      <!-- Your content here -->
    </td>
  </tr>
</table>`,
        autoFix: (html) => {
          // Don't add tables if there's already content structure
          if (!/<table[^>]*>/i.test(html) && html.length > 100) {
            return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; margin:0 auto;">
  <tr>
    <td align="center">
${html}
    </td>
  </tr>
</table>`;
          }
          return html;
        }
      },

      inlineStyles: {
        id: 'inline-css',
        category: 'compatibility',
        weight: 12,
        level: 'error',
        description: 'Inline styles required for email clients',
        test: (htmlString) => {
          // Count elements with inline styles
          const styleMatches = htmlString.match(/style\s*=\s*["'][^"']*["']/gi);
          return styleMatches && styleMatches.length >= 3;
        },
        message: (passed, htmlString) => {
          const styleMatches = htmlString.match(/style\s*=\s*["'][^"']*["']/gi);
          const styleCount = styleMatches ? styleMatches.length : 0;
          return passed 
            ? `Inline styles detected (${styleCount} elements) ✓` 
            : `Missing inline styles (only ${styleCount} found). Use style attributes instead of <style> tags`;
        },
        fix: 'Add style attributes to elements: <div style="font-family: Arial; color: #333;">',
        autoFix: (html) => {
          // Add basic styles to common elements if missing
          let fixedHtml = html;
          const replacements = [
            [/<p(?!\s+style)/g, '<p style="margin:0 0 15px 0; font-family:Arial,sans-serif;"'],
            [/<h1(?!\s+style)/g, '<h1 style="font-family:Arial,sans-serif; font-size:24px; margin:0 0 15px 0;"'],
            [/<h2(?!\s+style)/g, '<h2 style="font-family:Arial,sans-serif; font-size:20px; margin:0 0 12px 0;"'],
            [/<a\s+href=([^>]*)>/g, '<a href=$1 style="color:#3b82f6; text-decoration:none;">'],
            [/<td(?!\s+style)(?!\s+[^>]*>)/g, '<td style="font-family:Arial,sans-serif;"']
          ];
          
          replacements.forEach(([pattern, replacement]) => {
            fixedHtml = fixedHtml.replace(pattern, replacement);
          });
          return fixedHtml;
        }
      },

      noFlexGrid: {
        id: 'no-flex-grid',
        category: 'compatibility',
        weight: 10,
        level: 'error',
        description: 'Avoid Flexbox and Grid for email compatibility',
        test: (htmlString) => {
          // Check for flexbox or grid CSS
          const hasFlexGrid = /display\s*:\s*(flex|inline-flex|grid|inline-flex)/i.test(htmlString) ||
                            /flex-direction/i.test(htmlString) ||
                            /grid-template/i.test(htmlString);
          return !hasFlexGrid;
        },
        message: (passed) => passed 
          ? 'No Flexbox/Grid detected ✓' 
          : 'Flexbox or Grid detected. Use tables instead for email compatibility',
        fix: 'Replace Flexbox/Grid with table layouts',
        autoFix: (html) => {
          return html
            .replace(/display\s*:\s*flex/gi, 'display: block')
            .replace(/display\s*:\s*inline-flex/gi, 'display: inline-block')
            .replace(/display\s*:\s*grid/gi, 'display: block')
            .replace(/display\s*:\s*inline-grid/gi, 'display: inline-block');
        }
      },

      msoSupport: {
        id: 'mso-support',
        category: 'compatibility',
        weight: 15,
        level: 'warning',
        description: 'Microsoft Outlook conditional comments',
        test: (htmlString) => {
          return htmlString.includes('<!--[if mso]') || 
                 htmlString.includes('[if mso]') ||
                 /mso-[a-z-]+:/i.test(htmlString);
        },
        message: (passed) => passed 
          ? 'Outlook conditional comments detected ✓' 
          : 'Missing Outlook support. Add conditional comments for better rendering',
        fix: `Add Outlook conditional comments:
<!--[if mso]>
<style type="text/css">
  /* Outlook-specific styles */
  .outlook-fix { display: none !important; }
</style>
<![endif]-->`,
        autoFix: (html) => {
          if (!html.includes('[if mso]')) {
            return `<!--[if mso]>
<style type="text/css">
body, table, td { font-family: Arial, sans-serif !important; }
</style>
<![endif]-->
${html}`;
          }
          return html;
        }
      },

      // ACCESSIBILITY RULES
      imgAltText: {
        id: 'img-alt',
        category: 'accessibility',
        weight: 10,
        level: 'warning',
        description: 'Alt text for images',
        test: (htmlString) => {
          // Find all img tags
          const imgRegex = /<img[^>]*>/gi;
          const imgs = htmlString.match(imgRegex);
          if (!imgs) return true; // No images is okay
          
          let validAltCount = 0;
          imgs.forEach(imgTag => {
            // Check if alt attribute exists and has content
            const hasAlt = /alt\s*=\s*["'][^"']*["']/i.test(imgTag);
            if (hasAlt) {
              const altMatch = imgTag.match(/alt\s*=\s*["']([^"']*)["']/i);
              if (altMatch && altMatch[1] && altMatch[1].trim().length > 2) {
                validAltCount++;
              }
            }
          });
          
          return imgs.length === 0 || (validAltCount / imgs.length) >= 0.8;
        },
        message: (passed, htmlString) => {
          const imgRegex = /<img[^>]*>/gi;
          const imgs = htmlString.match(imgRegex) || [];
          const validAlts = imgs.filter(img => {
            const hasAlt = /alt\s*=\s*["'][^"']*["']/i.test(img);
            if (hasAlt) {
              const altMatch = img.match(/alt\s*=\s*["']([^"']*)["']/i);
              return altMatch && altMatch[1] && altMatch[1].trim().length > 2;
            }
            return false;
          }).length;
          
          if (imgs.length === 0) return 'No images found';
          return passed 
            ? `${validAlts}/${imgs.length} images have alt text ✓` 
            : `${imgs.length - validAlts} images missing alt text`;
        },
        fix: 'Add alt attribute to images: <img src="image.jpg" alt="Description">',
        autoFix: (html) => {
          return html.replace(/<img([^>]*)>/gi, (match, attrs) => {
            if (!/<img[^>]*alt=["'][^"']*["'][^>]*>/gi.test(match)) {
              return `<img${attrs} alt="Image">`;
            }
            return match;
          });
        }
      },

      imgDimensions: {
        id: 'img-dimensions',
        category: 'performance',
        weight: 8,
        level: 'warning',
        description: 'Width and height attributes for images',
        test: (htmlString) => {
          const imgRegex = /<img[^>]*>/gi;
          const imgs = htmlString.match(imgRegex);
          if (!imgs) return true;
          
          let dimensionedCount = 0;
          imgs.forEach(imgTag => {
            const hasWidth = /width\s*=\s*["'][^"']*["']/i.test(imgTag);
            const hasHeight = /height\s*=\s*["'][^"']*["']/i.test(imgTag);
            if (hasWidth && hasHeight) dimensionedCount++;
          });
          
          return imgs.length === 0 || (dimensionedCount / imgs.length) >= 0.7;
        },
        message: (passed, htmlString) => {
          const imgRegex = /<img[^>]*>/gi;
          const imgs = htmlString.match(imgRegex) || [];
          const dimensioned = imgs.filter(img => {
            const hasWidth = /width\s*=\s*["'][^"']*["']/i.test(img);
            const hasHeight = /height\s*=\s*["'][^"']*["']/i.test(img);
            return hasWidth && hasHeight;
          }).length;
          
          if (imgs.length === 0) return 'No images found';
          return passed 
            ? `${dimensioned}/${imgs.length} images have dimensions ✓` 
            : `${imgs.length - dimensioned} images missing dimensions`;
        },
        fix: 'Add width and height attributes: <img src="image.jpg" width="600" height="300">',
        autoFix: (html) => {
          return html.replace(/<img([^>]*)>/gi, (match, attrs) => {
            if (!/<img[^>]*width=["'][^"']*["'][^>]*>/gi.test(match)) {
              return `<img${attrs} width="600" height="auto">`;
            }
            return match;
          });
        }
      },

      // SECURITY RULES
      noForbiddenTags: {
        id: 'no-forbidden-tags',
        category: 'security',
        weight: 10,
        level: 'error',
        description: 'Remove dangerous tags from email',
        test: (htmlString) => {
          const forbiddenTags = ['<script', '<form', '<video', '<iframe', '<audio', '<object', '<embed', '<input', '<textarea', '<button'];
          return !forbiddenTags.some(tag => htmlString.includes(tag));
        },
        message: (passed, htmlString) => {
          const forbiddenTags = [
            { tag: '<script', name: 'script' },
            { tag: '<form', name: 'form' },
            { tag: '<video', name: 'video' },
            { tag: '<iframe', name: 'iframe' },
            { tag: '<audio', name: 'audio' },
            { tag: '<object', name: 'object' },
            { tag: '<embed', name: 'embed' },
            { tag: '<input', name: 'input' },
            { tag: '<textarea', name: 'textarea' },
            { tag: '<button', name: 'button' }
          ];
          
          const foundTags = forbiddenTags
            .filter(({ tag }) => htmlString.includes(tag))
            .map(({ name }) => name);
          
          if (passed) return 'No forbidden tags detected ✓';
          return `Found forbidden tags: ${foundTags.join(', ')}`;
        },
        fix: 'Remove script, form, video, iframe, audio, object, embed, input, textarea, and button tags',
        autoFix: (html) => {
          return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
            .replace(/<video\b[^<]*(?:(?!<\/video>)<[^<]*)*<\/video>/gi, '')
            .replace(/<audio\b[^<]*(?:(?!<\/audio>)<[^<]*)*<\/audio>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
            .replace(/<input[^>]*>/gi, '')
            .replace(/<textarea[^>]*>[\s\S]*?<\/textarea>/gi, '')
            .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '');
        }
      },

      // BEST PRACTICE RULES
      preheaderText: {
        id: 'preheader',
        category: 'bestPractice',
        weight: 5,
        level: 'info',
        description: 'Preheader text for email preview',
        test: (htmlString) => {
          const patterns = [
            /preheader/i,
            /preview-text/i,
            /display\s*:\s*none[^>]*>[^<]{10,150}</i,
            /visibility\s*:\s*hidden[^>]*>[^<]{10,150}</i,
            /font-size\s*:\s*0[^>]*>[^<]{10,150}</i,
            /height\s*:\s*0[^>]*>[^<]{10,150}</i,
            /opacity\s*:\s*0[^>]*>[^<]{10,150}</i
          ];
          
          return patterns.some(pattern => pattern.test(htmlString));
        },
        message: (passed) => passed 
          ? 'Preheader text detected ✓' 
          : 'Consider adding preheader text for better open rates',
        fix: `Add hidden preheader text:
<span style="display:none; font-size:0; height:0; opacity:0;">
  Your preview text here. This won't be visible in the email body.
</span>`,
        autoFix: (html) => {
          if (!/display\s*:\s*none[^>]*>[^<]{10,}/i.test(html)) {
            return `<span style="display:none; font-size:0; height:0; opacity:0; visibility:hidden;">
  Preview your email here
</span>
${html}`;
          }
          return html;
        }
      },

      viewportMeta: {
        id: 'viewport-meta',
        category: 'bestPractice',
        weight: 3,
        level: 'info',
        description: 'Viewport meta tag for mobile',
        test: (htmlString) => {
          return /<meta[^>]*name\s*=\s*["']viewport["'][^>]*>/i.test(htmlString);
        },
        message: (passed) => passed 
          ? 'Viewport meta tag found ✓' 
          : 'Add viewport meta tag for better mobile rendering',
        fix: 'Add: <meta name="viewport" content="width=device-width, initial-scale=1">',
        autoFix: (html) => {
          if (!/<meta[^>]*name\s*=\s*["']viewport["'][^>]*>/i.test(html)) {
            // Try to insert after head tag
            if (html.includes('<head>')) {
              return html.replace('<head>', '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1">');
            } else if (html.includes('<html>')) {
              return html.replace('<html>', '<html>\n<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n</head>');
            } else {
              return '<meta name="viewport" content="width=device-width, initial-scale=1">\n' + html;
            }
          }
          return html;
        }
      },

      // NEW ENHANCED RULES
      responsiveTables: {
        id: 'responsive-tables',
        category: 'compatibility',
        weight: 8,
        level: 'warning',
        description: 'Responsive table design',
        test: (htmlString) => {
          const tableRegex = /<table[^>]*>/gi;
          const tables = htmlString.match(tableRegex);
          if (!tables || tables.length === 0) return false;
          
          let responsiveCount = 0;
          tables.forEach(tableTag => {
            const hasWidth = /width\s*=\s*["'][^"']*["']/i.test(tableTag) || 
                           /width\s*:\s*(100%|\d+%)/i.test(tableTag);
            const hasCellpadding = /cellpadding\s*=\s*["'][^"']*["']/i.test(tableTag) ||
                                 /cellpadding/i.test(tableTag);
            const hasMaxWidth = /max-width/i.test(tableTag);
            
            if (hasWidth && (hasCellpadding || hasMaxWidth)) responsiveCount++;
          });
          
          return responsiveCount > 0;
        },
        message: (passed, htmlString) => {
          const tableRegex = /<table[^>]*>/gi;
          const tables = htmlString.match(tableRegex) || [];
          return passed 
            ? 'Responsive tables detected ✓' 
            : 'Tables may not be mobile-responsive';
        },
        fix: 'Add: <table width="100%" style="max-width:600px;" cellpadding="0" cellspacing="0">',
        autoFix: (html) => {
          return html.replace(/<table([^>]*)>/gi, (match, attrs) => {
            if (!/<table[^>]*width=["'][^"']*["'][^>]*>/gi.test(match) && 
                !/width\s*:\s*(100%|\d+%)/i.test(match)) {
              return `<table${attrs} width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">`;
            }
            return match;
          });
        }
      },

      fontSizeUnits: {
        id: 'font-size-units',
        category: 'compatibility',
        weight: 6,
        level: 'warning',
        description: 'Use absolute font units',
        test: (htmlString) => {
          // Find font-size declarations
          const fontSizeMatches = htmlString.match(/font-size\s*:\s*[^;]+/gi);
          if (!fontSizeMatches) return true;
          
          let absoluteUnits = 0;
          fontSizeMatches.forEach(declaration => {
            const value = declaration.split(':')[1].trim();
            // Accept px, pt, and numeric values (assumed to be px)
            if (value.includes('px') || value.includes('pt') || /^\d+$/.test(value.replace('px', '').replace('pt', '').trim())) {
              absoluteUnits++;
            }
          });
          
          return absoluteUnits === fontSizeMatches.length;
        },
        message: (passed, htmlString) => {
          const fontSizeMatches = htmlString.match(/font-size\s*:\s*[^;]+/gi) || [];
          return passed 
            ? 'Font sizes use absolute units ✓' 
            : 'Avoid em/rem units in email. Use px or pt';
        },
        fix: 'Use px or pt: style="font-size: 16px;"',
        autoFix: (html) => {
          return html.replace(/font-size\s*:\s*([0-9.]+)\s*(em|rem)/gi, 'font-size: $1px');
        }
      },

      secureImages: {
        id: 'secure-images',
        category: 'security',
        weight: 7,
        level: 'warning',
        description: 'Use HTTPS for images',
        test: (htmlString) => {
          const imgRegex = /<img[^>]*>/gi;
          const imgs = htmlString.match(imgRegex);
          if (!imgs) return true;
          
          let secureCount = 0;
          imgs.forEach(imgTag => {
            const srcMatch = imgTag.match(/src\s*=\s*["']([^"']*)["']/i);
            if (srcMatch) {
              const src = srcMatch[1];
              if (src.startsWith('https://') || src.startsWith('data:') || src.startsWith('/')) {
                secureCount++;
              }
            }
          });
          
          return imgs.length === 0 || (secureCount / imgs.length) >= 0.8;
        },
        message: (passed, htmlString) => {
          const imgRegex = /<img[^>]*>/gi;
          const imgs = htmlString.match(imgRegex) || [];
          const secureImages = imgs.filter(img => {
            const srcMatch = img.match(/src\s*=\s*["']([^"']*)["']/i);
            if (!srcMatch) return false;
            const src = srcMatch[1];
            return src.startsWith('https://') || src.startsWith('data:') || src.startsWith('/');
          }).length;
          
          if (imgs.length === 0) return 'No images found';
          return passed 
            ? `${secureImages}/${imgs.length} images use HTTPS ✓` 
            : `${imgs.length - secureImages} images may be insecure (use HTTPS)`;
        },
        fix: 'Use HTTPS URLs for images: src="https://example.com/image.jpg"',
        autoFix: (html) => {
          return html.replace(/src\s*=\s*["']http:\/\/([^"']*)["']/gi, 'src="https://$1"');
        }
      },

      linkStyles: {
        id: 'link-styles',
        category: 'compatibility',
        weight: 4,
        level: 'info',
        description: 'Proper link styling',
        test: (htmlString) => {
          const linkRegex = /<a\s[^>]*href\s*=\s*["'][^"']*["'][^>]*>/gi;
          const links = htmlString.match(linkRegex);
          if (!links) return true;
          
          let styledLinks = 0;
          links.forEach(linkTag => {
            const hasColor = /color\s*:\s*[^;]+/i.test(linkTag);
            const hasDecoration = /text-decoration\s*:\s*[^;]+/i.test(linkTag);
            
            if (hasColor && hasDecoration) styledLinks++;
          });
          
          return links.length === 0 || (styledLinks / links.length) >= 0.7;
        },
        message: (passed, htmlString) => {
          const linkRegex = /<a\s[^>]*href\s*=\s*["'][^"']*["'][^>]*>/gi;
          const links = htmlString.match(linkRegex) || [];
          return passed 
            ? 'Links properly styled ✓' 
            : 'Style links with color and text-decoration';
        },
        fix: 'Add: <a href="#" style="color:#3b82f6; text-decoration:underline;">',
        autoFix: (html) => {
          return html.replace(/<a\s+([^>]*href\s*=\s*["'][^"']*["'][^>]*)>/gi, (match, attrs) => {
            if (!match.includes('style=')) {
              return `<a ${attrs} style="color:#3b82f6; text-decoration:underline;">`;
            }
            return match;
          });
        }
      }
    };
  }

  getAllRules() {
    return Object.values(this.rules);
  }

  getRule(id) {
    return this.rules[id];
  }

  getCategories() {
    return this.categories;
  }

  calculateCategoryScores(results) {
    const categoryScores = {};
    
    Object.keys(this.categories).forEach(category => {
      categoryScores[category] = {
        passed: 0,
        total: 0,
        weight: this.categories[category].weight
      };
    });

    results.forEach(result => {
      const category = result.rule.category;
      if (categoryScores[category]) {
        categoryScores[category].total++;
        if (result.passed) {
          categoryScores[category].passed++;
        }
      }
    });

    return categoryScores;
  }
}

// Export for use in other files
const rulesEngine = new EmailRulesEngine();
const RULES = rulesEngine.getAllRules();
const CATEGORIES = rulesEngine.getCategories();