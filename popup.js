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
    }
    if (result.theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        updateThemeIcons('dark');
    } else {
        document.body.removeAttribute('data-theme');
        updateThemeIcons('light');
    }
  });

  inspectToggle.addEventListener('change', () => {
    const isInspecting = inspectToggle.checked;
    chrome.storage.local.set({ inspecting: isInspecting });
    sendMessageToContentScript({ action: 'toggleBox', value: isInspecting });
  });

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
  });

  copyBtn.addEventListener('click', () => {
    const text = selectorResult.value;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      showStatus('Copiado! Limpando...');
      setTimeout(clearState, 700);
    }).catch(err => {
      showStatus('Erro ao copiar');
      console.error('Failed to copy: ', err);
    });
  });

  clearBtn.addEventListener('click', () => {
      clearState();
      showStatus('Limpo!');
  });

  function clearState() {
      chrome.storage.local.remove(['selectorOptions', 'lastSelector']);
  }

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.selectorOptions) {
        const options = changes.selectorOptions.newValue || [];
        updateSelectorList(options);
      }
      if (changes.inspecting) {
        inspectToggle.checked = changes.inspecting.newValue;
      }
    }
  });

  const selectorListContainer = document.getElementById('selectorList');
  let currentOptions = [];
  let selectedIndex = 0;

  function updateSelectorList(options) {
      currentOptions = options;
      selectorListContainer.innerHTML = '';
      
      if (options.length === 0) {
          selectorListContainer.innerHTML = '<div class="empty-state">Nenhum elemento selecionado.</div>';
          selectorResult.value = '';
          return;
      }

      options.forEach((opt, index) => {
          const item = document.createElement('div');
          item.className = 'selector-item';
          if (index === 0) item.classList.add('active'); 

          const header = document.createElement('div');
          header.className = 'selector-item-header';
          
          const label = document.createElement('span');
          label.className = 'selector-label';
          label.textContent = opt.label;

          header.appendChild(label);
          item.appendChild(header);

          const valueDiv = document.createElement('div');
          valueDiv.className = 'selector-value';
          valueDiv.textContent = opt.value;
          item.appendChild(valueDiv);

          item.addEventListener('click', () => {
              selectOption(index);
          });

          selectorListContainer.appendChild(item);
      });

      selectOption(0);
      showStatus('Opções atualizadas!');
  }

  function selectOption(index) {
      selectedIndex = index;
      
      const items = selectorListContainer.querySelectorAll('.selector-item');
      items.forEach((el, idx) => {
          if (idx === index) el.classList.add('active');
          else el.classList.remove('active');
      });

      if (currentOptions[index]) {
          const framework = frameworkSelect.value;
          selectorResult.value = formatForFramework(currentOptions[index], framework);
      }
  }
  
  frameworkSelect.addEventListener('change', () => {
    const framework = frameworkSelect.value;
    chrome.storage.local.set({ framework: framework });
    
    if (currentOptions.length > 0) {
        selectOption(selectedIndex);
    }
  });

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
        chrome.tabs.sendMessage(activeTab.id, message).catch((err) => {
          console.log('Content script not ready, injecting...', err);
          chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content.js']
          }).then(() => {
             setTimeout(() => {
                chrome.tabs.sendMessage(activeTab.id, message).catch(e => console.error("Retry failed", e));
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
