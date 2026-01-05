document.addEventListener('DOMContentLoaded', () => {
  const inspectToggle = document.getElementById('inspectToggle');
  const frameworkSelect = document.getElementById('frameworkSelect');
  const selectorResult = document.getElementById('selectorResult');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');
  const statusMessage = document.getElementById('statusMessage');
  const themeToggle = document.getElementById('themeToggle');
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');
  


  // Load State
  // Load State
  // Load State
  chrome.storage.local.get(['inspecting', 'framework', 'lastSelector', 'selectorOptions', 'theme'], (result) => {
    inspectToggle.checked = !!result.inspecting;
    if (result.framework) {
      frameworkSelect.value = result.framework;
    }
    if (result.lastSelector) {
      selectorResult.value = result.lastSelector;
    }
    if (result.selectorOptions) {
        updateSelectorList(result.selectorOptions);
        updateReSelectButton(result.inspecting); // Initial check
    }
    // Theme
    if (result.theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        updateThemeIcons('dark');
    } else {
        document.body.removeAttribute('data-theme');
        updateThemeIcons('light');
    }
  });

  // Tab Switching


  const reSelectBtn = document.getElementById('reSelectBtn'); // New Re-Select button

  inspectToggle.addEventListener('change', () => {
    const isInspecting = inspectToggle.checked;
    chrome.storage.local.set({ inspecting: isInspecting });
    sendMessageToContentScript({ action: 'toggleBox', value: isInspecting });
    updateReSelectButton(isInspecting);
  });
  
  // Logic for Re-Select Button
  reSelectBtn.addEventListener('click', () => {
      // Turn Inspection ON again
      inspectToggle.checked = true;
      inspectToggle.dispatchEvent(new Event('change')); // Trigger change listener
  });

  function updateReSelectButton(isInspecting) {
      // If we are inspecting, hide button (or show Cancel?)
      // If Locked (not inspecting) AND we have options, show Re-Select
      if (!isInspecting && selectorResult.value) {
          reSelectBtn.style.display = 'flex';
          copyBtn.style.display = 'flex'; // Ensure copy is visible
      } else if (isInspecting) {
         // While inspecting, maybe hide Re-Select?
         reSelectBtn.style.display = 'none';
      } else {
         // Empty state, not inspecting
         reSelectBtn.style.display = 'none';
      }
  }

  themeToggle.addEventListener('click', () => {
      const isDark = document.body.getAttribute('data-theme') === 'dark';
      const newTheme = isDark ? 'light' : 'dark';
      
      if (newTheme === 'dark') {
          document.body.setAttribute('data-theme', 'dark');
      } else {
          document.body.removeAttribute('data-theme');
      }
      
      updateThemeIcons(newTheme);
      chrome.storage.local.set({ theme: newTheme });
  });

  function updateThemeIcons(theme) {
      if (theme === 'dark') {
          sunIcon.style.display = 'none';
          moonIcon.style.display = 'block';
      } else {
          sunIcon.style.display = 'block';
          moonIcon.style.display = 'none';
      }
  }

  frameworkSelect.addEventListener('change', () => {
    const framework = frameworkSelect.value;
    chrome.storage.local.set({ framework: framework });
    // Update both lists to reflect framework change
    if (currentOptions.length > 0) selectOption(selectedIndex);
  });

  copyBtn.addEventListener('click', () => {
    copyTextToClipboard(selectorResult.value);
  });

  clearBtn.addEventListener('click', () => {
      clearState();
      showStatus('Limpo!');
  });
  


  function clearState() {
      chrome.storage.local.remove(['selectorOptions', 'lastSelector']);
      selectorResult.value = '';
      updateSelectorList([]); // Clear UI list
      updateReSelectButton(inspectToggle.checked);
  }

  // Ensure inspection stops when the extension window/panel is closed
  window.addEventListener('unload', () => {
       chrome.storage.local.set({ inspecting: false });
  });
  // Handle Auto-Lock when a new selector is captured
  // Handle Auto-Lock when a new selector is captured
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      
      // Check for new capture
      if (changes.selectorOptions) {
        // Determine options
        const options = changes.selectorOptions.newValue || [];

        updateSelectorList(options);
             
        // Auto-Lock UI Feedback
        if (options.length > 0) {
           if (inspectToggle.checked) {
              inspectToggle.checked = false;
              chrome.storage.local.set({ inspecting: false });
              sendMessageToContentScript({ action: 'toggleBox', value: false });
              showStatus('Travado! (Destrave para capturar outro)');
           }
        }
      }

      if (changes.inspecting) {
        inspectToggle.checked = changes.inspecting.newValue;
        updateReSelectButton(changes.inspecting.newValue); // Update button state
      }
    }
  });

  const selectorListContainer = document.getElementById('selectorList');
  let currentOptions = [];
  let selectedIndex = 0;

  function updateSelectorList(options) {
      currentOptions = options;
      selectorListContainer.innerHTML = '';
      
      // Update button visibility based on whether we have content
      updateReSelectButton(inspectToggle.checked);
      
      if (options.length === 0) {
          selectorListContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">👆</div><p>Ative "Inspecionar" e clique em um elemento.</p></div>';
          selectorResult.value = '';
          return;
      }

      options.forEach((opt, index) => {
          const item = createSelectorItem(opt, index, true); // true = selectable
          selectorListContainer.appendChild(item);
      });

      selectOption(0);
      showStatus('Opções atualizadas!');
  }
  

  
  function createSelectorItem(opt, index, isMainList) {
      const item = document.createElement('div');
      item.className = 'selector-item';
      if (isMainList && index === 0) item.classList.add('active'); 

      const header = document.createElement('div');
      header.className = 'selector-item-header';
      
      const label = document.createElement('span');
      label.className = 'selector-label';
      label.textContent = opt.label || opt.type;

      // Actions (Copy)
      const actions = document.createElement('div');
      actions.className = 'selector-actions';
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'mini-copy-btn';
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      copyBtn.title = "Copiar este seletor";
      copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const frame = frameworkSelect.value;
          const code = formatForFramework(opt, frame);
          copyTextToClipboard(code);
      });
      
      actions.appendChild(copyBtn);
      header.appendChild(label);
      header.appendChild(actions);
      item.appendChild(header);

      const valueDiv = document.createElement('div');
      valueDiv.className = 'selector-value';
      valueDiv.textContent = opt.value;
      item.appendChild(valueDiv);

      // Event Listeners for Interaction
      item.addEventListener('mouseenter', () => {
          // Reverse Highlight 
          const selectorToHighlight = opt.uniqueSelector || opt.value;
          sendMessageToContentScript({ action: 'highlightSelector', value: selectorToHighlight });
      });
      
      item.addEventListener('mouseleave', () => {
           sendMessageToContentScript({ action: 'highlightSelector', value: null });
      });

      // Always selectable now that history is gone
      item.addEventListener('click', () => {
          selectOption(index);
      });

      return item;
  }

  function selectOption(index) {
      selectedIndex = index;
      
      const items = selectorListContainer.querySelectorAll('.selector-item');
      items.forEach((el, idx) => {
          if (idx === index) el.classList.add('active');
          else el.classList.remove('active');
      });

      if (currentOptions[index]) {
          const selectedOpt = currentOptions[index];
          const framework = frameworkSelect.value;
          selectorResult.value = formatForFramework(selectedOpt, framework);
      }
  }
  
  function copyTextToClipboard(text) {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        showStatus('Copiado!');
      }).catch(err => {
        showStatus('Erro ao copiar');
        console.error('Failed to copy: ', err);
      });
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

  function sendMessageToContentScript(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, message).catch(() => {
          // If message fails, script might not be loaded. Try injecting it.
          console.log('Content script not ready, injecting...');
          chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content.js']
          }).then(() => {
             // Wait a tiny bit for script to initialize
             setTimeout(() => {
                chrome.tabs.sendMessage(activeTab.id, message).catch(e => {
                    console.error("Retry failed", e);
                    showStatus('Erro: Recarregue a página');
                });
             }, 100);
          }).catch(scriptErr => {
             console.error('Failed to inject script', scriptErr);
             showStatus('Erro: Recarregue a página');
          });
        });
      }
    });
  }

  function showStatus(msg) {
    statusMessage.textContent = msg;
    setTimeout(() => {
      statusMessage.textContent = '';
    }, 2000);
  }
});
