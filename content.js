/**
 * QA Selector Helper - Content Script
 * Responsável por destacar elementos, capturar cliques e gerar seletores.
 */

if (window.hasRun) {
  console.log('QA Selector Helper: Already injected');
} else {
  window.hasRun = true;
  console.log('QA Selector Helper: Injected');

let isInspecting = false;
let currentFramework = 'cypress';
let overlayElement = null;
let lastTarget = null;

chrome.storage.local.get(['inspecting', 'framework'], (result) => {
  isInspecting = !!result.inspecting;
  currentFramework = result.framework || 'cypress';
  updateInspectorState();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.inspecting) {
    isInspecting = changes.inspecting.newValue;
    updateInspectorState();
  }
  if (changes.framework) {
    currentFramework = changes.framework.newValue;
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleBox') {
    isInspecting = request.value;
    updateInspectorState();
  } else if (request.action === 'highlightSelector') {
    const selector = request.value;
    if (!selector) {
        // If we clear the highlight (mouse leave list), but we are effectively "LOCKED" (inspecting=false && lastTarget),
        // we should restore the lock unique to the lastTarget
        if (!isInspecting && lastTarget) {
            highlightElement(lastTarget, false, true);
        } else {
            removeOverlay();
        }
        return;
    }
    
    try {
        const el = document.querySelector(selector);
        if (el) {
            highlightElement(el, true);
        } else {
            // Invalid selector valid? Fallback logic if needed, else remove
             if (!isInspecting && lastTarget) {
                 highlightElement(lastTarget, false, true);
             } else {
                 removeOverlay();
             }
        }
    } catch (e) {
        console.error('Invalid selector for highlight:', selector);
        if (!isInspecting && lastTarget) {
             highlightElement(lastTarget, false, true);
        } else {
             removeOverlay();
        }
    }
  }
});

let cursorStyle = null;

function updateInspectorState() {
  if (isInspecting) {
    if (!cursorStyle) {
        cursorStyle = document.createElement('style');
        cursorStyle.innerHTML = '* { cursor: crosshair !important; }';
        document.head.appendChild(cursorStyle);
    }
    
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    createOverlay();
  } else {
    if (cursorStyle) {
        cursorStyle.remove();
        cursorStyle = null;
    }
    
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('click', handleClick, true);
    
    // VISUAL LOCK: If we stopped inspecting but have a target, show it as LOCKED (dotted)
    if (lastTarget) {
        highlightElement(lastTarget, false, true); // true = isLocked
    } else {
        removeOverlay();
    }
  }
}

function createOverlay() {
  if (!overlayElement) {
    overlayElement = document.createElement('div');
    overlayElement.id = 'qa-helper-highlight';
    overlayElement.style.position = 'absolute';
    overlayElement.style.border = '2px solid #ff00ff';
    overlayElement.style.backgroundColor = 'rgba(255, 0, 255, 0.1)';
    overlayElement.style.zIndex = '9999999';
    overlayElement.style.pointerEvents = 'none';
    overlayElement.style.transition = 'all 0.1s ease';
    overlayElement.style.display = 'none';
    
    const label = document.createElement('span');
    label.id = 'qa-helper-label';
    label.style.position = 'absolute';
    label.style.top = '-22px';
    label.style.left = '-2px';
    label.style.backgroundColor = '#ff00ff';
    label.style.color = 'white';
    label.style.padding = '2px 6px';
    label.style.fontSize = '12px';
    label.style.fontWeight = 'bold';
    label.style.fontFamily = 'monospace';
    label.style.borderRadius = '3px 3px 0 0';
    label.style.whiteSpace = 'nowrap';
    label.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
    overlayElement.appendChild(label);

    document.body.appendChild(overlayElement);
  }
}

function removeOverlay() {
  if (overlayElement) {
    overlayElement.remove();
    overlayElement = null;
  }
}

function isExtensionValid() {
  try {
    return !!chrome.runtime.id;
  } catch(e) {
    return false;
  }
}

function cleanupOrphanedScript() {
  console.log('[QA Helper] Contexto invalidado. Removendo listeners antigos.');
  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('mouseout', handleMouseOut, true);
  document.removeEventListener('click', handleClick, true);
  removeOverlay();
  if (cursorStyle) {
      cursorStyle.remove();
      cursorStyle = null;
  }
}

function handleMouseOver(e) {
  if (!isExtensionValid()) {
      cleanupOrphanedScript();
      return;
  }
  if (!isInspecting || e.target === overlayElement) return;
  e.stopPropagation();
  lastTarget = e.target;
  highlightElement(e.target);
}

function handleMouseOut(e) {
 if (!isExtensionValid()) {
      cleanupOrphanedScript();
      return;
  }
  if (!isInspecting) return;
  e.stopPropagation();
  if (overlayElement) overlayElement.style.display = 'none';
}

function highlightElement(el, isValidation = false, isLocked = false) {
  if (!isExtensionValid()) return;
  if (!overlayElement) createOverlay();
  
  const rect = el.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  overlayElement.style.width = rect.width + 'px';
  overlayElement.style.height = rect.height + 'px';
  overlayElement.style.top = (rect.top + scrollTop) + 'px';
  overlayElement.style.left = (rect.left + scrollLeft) + 'px';
  overlayElement.style.display = 'block';

  if (isValidation) {
      overlayElement.style.border = '2px solid #2196f3';
      overlayElement.style.backgroundColor = 'rgba(33, 150, 243, 0.2)';
  } else if (isLocked) {
      // LOCKED STYLE: Red Dotted as requested
      overlayElement.style.border = '3px dotted #ff0000'; 
      overlayElement.style.backgroundColor = 'rgba(255, 0, 0, 0.05)';
  } else {
      overlayElement.style.border = '2px solid #ff00ff';
      overlayElement.style.backgroundColor = 'rgba(255, 0, 255, 0.1)';
  }

  const label = overlayElement.querySelector('#qa-helper-label');
  if (label) {
      if (isValidation) {
           label.style.backgroundColor = '#2196f3';
           label.textContent = 'Preview';
      } else {
          label.style.backgroundColor = '#ff00ff';
          let text = el.tagName.toLowerCase();
          if (el.id) text += `#${el.id}`;
          else if (el.className && typeof el.className === 'string') {
              const firstClass = el.className.split(' ')[0];
              if(firstClass) text += `.${firstClass}`;
          }
          label.textContent = text;
      }
      
      if (rect.top < 25) {
          label.style.top = '100%';
          label.style.borderRadius = '0 0 3px 3px';
      } else {
          label.style.top = '-22px';
          label.style.borderRadius = '3px 3px 0 0';
      }
  }
}

function handleClick(e) {
  if (!isExtensionValid()) {
      cleanupOrphanedScript();
      return;
  }
  if (!isInspecting) return;
  
  e.preventDefault();
  e.stopPropagation();


  const target = e.target;
  const selectorCandidates = generateSelectors(target);
  
  if (selectorCandidates.length === 0) return;

  const bestCandidate = selectorCandidates[0];
  const formattedCode = formatForFramework(bestCandidate, currentFramework);

  if (bestCandidate.element && bestCandidate.element !== target) {
      highlightElement(bestCandidate.element);
      console.log('[QA Helper] Ajustando destaque para:', bestCandidate.element);
  }

  const serializableCandidates = selectorCandidates.map(c => ({
      type: c.type,
      value: c.value,
      label: c.label,
      uniqueSelector: c.uniqueSelector
  }));

  // AUTO-LOCK: Disable inspection immediately to prevent further hovering
  isInspecting = false;
  // Send message to popup (if open) and update storage
  chrome.storage.local.set({
    inspecting: false,
    lastSelector: formattedCode,
    selectorOptions: serializableCandidates,
    captureTimestamp: Date.now()
  }, () => {
    // We manually update state here to ensure listeners are removed NOW
    updateInspectorState();

    // LOCK CONFIRMATION: Flash Green, then set to LOCKED (Dotted)
    if (overlayElement) {
        // Force the element to stay visible during the flash despite updateInspectorState cleanup
        // (updateInspectorState might try to redraw/lock, but we want the Green Flash first)
        // Since updateInspectorState calls highlightElement(locked=true), we just override the style temporarily
        
        overlayElement.style.border = '2px solid #00ff00';
        overlayElement.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
        overlayElement.style.display = 'block'; // Ensure visible
        
        setTimeout(() => {
            // After flash, ensure we are in the clean "Locked" state
            if (lastTarget) {
                highlightElement(lastTarget, false, true); // true = isLocked
            }
      }, 500);
    }
  });
}

function generateSelectors(targetElement) {
  const candidates = [];
  const isUnique = (selector) => document.querySelectorAll(selector).length === 1;

  console.log('[QA Helper] Gerando seletores para:', targetElement);

  // Helper to ensure we have a valid CSS selector for highlighting
  const getSafeSelector = (el) => getCssPath(el);

  const qaAttributes = ['data-testid', 'data-cy', 'data-test', 'data-qa', 'data-qa-id', 'data-test-id'];

  const addCandidate = (data) => {
      // Ensure every candidate has a uniqueSelector for reverse highlighting
      if (!data.uniqueSelector) {
          data.uniqueSelector = getSafeSelector(data.element);
      }
      
      if (!candidates.some(c => c.value === data.value)) {
          candidates.push(data);
      }
  };

  for (const attr of qaAttributes) {
      if (targetElement.hasAttribute(attr)) {
          const val = targetElement.getAttribute(attr);
          if (val) {
              addCandidate({ 
                  type: 'css', 
                  value: `[${attr}="${val}"]`, 
                  element: targetElement,
                  label: `${attr} (próprio)`,
                  priority: 10
              });
          }
      }
  }

  if (targetElement.id) {
     const id = targetElement.id;
     if (!/^[0-9]+$/.test(id) && !/\d{10,}/.test(id) && !id.includes(':')) {
        const selector = `#${CSS.escape(id)}`;
        if (isUnique(selector)) {
            addCandidate({ type: 'css', value: selector, element: targetElement, label: 'id (próprio)', priority: 9 });
        }
     }
  }

  if (targetElement.name) {
      const name = targetElement.name;
      const selector = `[name="${CSS.escape(name)}"]`;
      if (isUnique(selector)) {
          addCandidate({ type: 'css', value: selector, element: targetElement, label: 'name (próprio)', priority: 8 });
      }
  }

  for (const attr of qaAttributes) {
    const elementWithAttr = targetElement.closest(`[${attr}]`);
    if (elementWithAttr && elementWithAttr !== targetElement) {
      const val = elementWithAttr.getAttribute(attr);
      if (val) {
          addCandidate({ 
              type: 'css', 
              value: `[${attr}="${val}"]`, 
              element: elementWithAttr,
              label: `${attr} (ancestral)`,
              priority: 5
          });
      }
    }
  }

  for (const attr of qaAttributes) {
    const childrenWithAttr = targetElement.querySelectorAll(`[${attr}]`);
    
    const limit = Math.min(childrenWithAttr.length, 10); 
    
    for(let i=0; i<limit; i++) {
        const child = childrenWithAttr[i];
        const val = child.getAttribute(attr);
        
        if (val) {
            addCandidate({ 
                type: 'css', 
                value: `[${attr}="${val}"]`, 
                element: child, 
                label: `${attr} (interno/${child.tagName.toLowerCase()})`,
                priority: 4 
            });
        }
    }
  }

  if (targetElement.tagName.toLowerCase() === 'label' && targetElement.hasAttribute('for')) {
      const forId = targetElement.getAttribute('for');
      if (forId) {
          const targetInput = document.getElementById(forId);
          if (targetInput) {
             const inputIdSelector = `#${CSS.escape(targetInput.id)}`;
             if (targetInput.id && isUnique(inputIdSelector)) {
                 addCandidate({ type: 'css', value: inputIdSelector, element: targetInput, label: 'label -> input id', priority: 7 });
             }
             for (const attr of qaAttributes) {
                  if (targetInput.hasAttribute(attr)) {
                       addCandidate({ 
                           type: 'css', 
                           value: `[${attr}="${targetInput.getAttribute(attr)}"]`,
                           element: targetInput,
                           label: `label -> input ${attr}`,
                           priority: 10
                       });
                  }
             }
          }
           addCandidate({ type: 'css', value: `#${CSS.escape(forId)}`, element: targetElement, label: 'label-for', priority: 6 });
      }
  }

  if (targetElement.getAttribute('placeholder')) {
      addCandidate({ type: 'placeholder', value: targetElement.getAttribute('placeholder'), element: targetElement, label: 'placeholder', priority: 3 });
  }
  
  if (targetElement.tagName.toLowerCase() === 'img' && targetElement.alt) {
      addCandidate({ type: 'alt', value: targetElement.alt, element: targetElement, label: 'alt', priority: 3 });
  }

  const interactiveElement = targetElement.closest('button, a, label, h1, h2, h3, h4, h5, h6, [role="button"]');
  const elForText = interactiveElement || targetElement;
  const text = elForText.innerText ? elForText.innerText.trim() : '';
  if (text && text.length > 0 && text.length < 40) {
      addCandidate({ type: 'text', value: text, element: elForText, label: 'text', priority: 2 });
  }

  if (targetElement.className && typeof targetElement.className === 'string') {
      const classes = targetElement.className.split(/\s+/)
        .filter(c => c.length > 0 && !c.startsWith('ng-') && !c.startsWith('css-') && !c.match(/^[0-9]/) && c.length > 3);
      
      for (const cls of classes) {
          const selector = `.${CSS.escape(cls)}`;
          if (isUnique(selector)) {
              addCandidate({ type: 'css', value: selector, element: targetElement, label: 'class', priority: 1 });
              break; 
          }
      }
  }

  if (candidates.length === 0) {
      addCandidate({ type: 'css', value: getCssPath(targetElement), element: targetElement, label: 'css-path', priority: 0 });
  }

  candidates.sort((a, b) => b.priority - a.priority);

  return candidates;
}

function getCssPath(el) {
  if (!(el instanceof Element)) return;
  const path = [];
  while (el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    if (el.id) {
      selector += '#' + CSS.escape(el.id);
      path.unshift(selector);
      break;
    } else {
      let sib = el, nth = 1;
      while (sib = sib.previousElementSibling) {
        if (sib.nodeName.toLowerCase() == selector) nth++;
      }
      if (nth != 1) selector += `:nth-of-type(${nth})`;
    }
    path.unshift(selector);
    el = el.parentNode;
  }
  return path.join(' > ');
}

function formatForFramework(selectorData, framework) {
    const { type, value } = selectorData;

    if (framework === 'cypress') {
        switch (type) {
            case 'text': return `cy.contains('${escapeQuote(value)}')`;
            case 'placeholder': return `cy.get('[placeholder="${escapeQuote(value)}"]')`;
            case 'alt': return `cy.get('[alt="${escapeQuote(value)}"]')`;
            default: return `cy.get('${value}')`;
        }
    } else {
        switch (type) {
            case 'text': return `page.getByText('${escapeQuote(value)}')`;
            case 'placeholder': return `page.getByPlaceholder('${escapeQuote(value)}')`;
            case 'alt': return `page.getByAltText('${escapeQuote(value)}')`;
            default: return `page.locator('${value}')`;
        }
    }
}

function escapeQuote(str) {
    return str.replace(/'/g, "\\'");
}
}
