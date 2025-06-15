// Background service worker for the extension
import { storage } from '@/lib/storage';

// Message types
interface BaseMessage {
  action: string;
}

interface TextSelectedMessage extends BaseMessage {
  action: 'textSelected';
  selectedText: string;
  context: { url: string; title: string; elementType?: string };
}

interface UseAsContextMessage extends BaseMessage {
  action: 'useAsContext';
  text: string;
  context: { url: string; title: string };
}

interface CreateTemplateMessage extends BaseMessage {
  action: 'createTemplate';
  text: string;
  context: { url: string; title: string };
}

interface ExecuteTemplateMessage extends BaseMessage {
  action: 'executeTemplate';
  templateId: string;
  context: { url: string; title: string };
}

interface EditTemplateMessage extends BaseMessage {
  action: 'editTemplate';
  templateId: string;
}

type ExtensionMessage = 
  | TextSelectedMessage 
  | UseAsContextMessage 
  | CreateTemplateMessage 
  | ExecuteTemplateMessage 
  | EditTemplateMessage 
  | BaseMessage;

// Install event handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('Prompt Template Builder installed');
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'prompt-templates',
    title: 'Prompt Templates',
    contexts: ['selection', 'editable'],
  });
  
  // Set up initial data if needed
  initializeExtension();
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'prompt-templates') {
    // Open popup
    chrome.action.openPopup();
  }
});

// Keyboard shortcuts handler
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-popup') {
    // Get current tab for context
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab?.id) {
      try {
        // Get selected text
        const response = await chrome.tabs.sendMessage(tab.id, { 
          action: 'getSelectedText' 
        });
        
        // Store context for popup
        await chrome.storage.session.set({
          popupContext: {
            selectedText: response?.text,
            url: tab.url,
            title: tab.title,
          }
        });
      } catch (error) {
        // Content script might not be ready, that's ok
        console.log('Could not get context:', error);
      }
    }
    
    // Open popup
    chrome.action.openPopup();
  }
});

// Message handler for communication between components
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true; // Keep message channel open for async responses
});

// Handle messages from content scripts and popup
async function handleMessage(request: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse: (response: { success?: boolean; error?: string }) => void) {
  try {
    switch (request.action) {
      case 'updateContextMenus':
        await updateContextMenus();
        sendResponse({ success: true });
        break;
        
      case 'textSelected':
        if ('selectedText' in request && 'context' in request) {
          await handleTextSelected(request.selectedText, request.context, sender.tab);
        }
        sendResponse({ success: true });
        break;
        
      case 'useAsContext':
        if ('text' in request && 'context' in request) {
          await handleUseAsContext(request.text, request.context);
        }
        sendResponse({ success: true });
        break;
        
      case 'createTemplate':
        if ('text' in request && 'context' in request) {
          await handleCreateTemplate(request.text, request.context);
        }
        sendResponse({ success: true });
        break;
        
      case 'openPopup':
        chrome.action.openPopup();
        sendResponse({ success: true });
        break;
        
      case 'openManager':
        await storage.openManager(request);
        sendResponse({ success: true });
        break;
        
      case 'openQuickAccess':
        await handleQuickAccess();
        sendResponse({ success: true });
        break;
        
      case 'editTemplate':
        if ('templateId' in request) {
          await handleEditTemplate(request.templateId);
        }
        sendResponse({ success: true });
        break;
        
      case 'executeTemplate':
        if ('templateId' in request && 'context' in request) {
          await handleExecuteTemplate(request.templateId, request.context, sender.tab);
        }
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Background message handler error:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Handle text selection from content script
async function handleTextSelected(selectedText: string, context: { url: string; title: string; elementType?: string }, tab?: chrome.tabs.Tab) {
  // Store context for potential use in popup
  await chrome.storage.session.set({
    lastSelection: {
      text: selectedText,
      context,
      timestamp: Date.now(),
      tabId: tab?.id,
    }
  });
  
  // Could trigger context menu updates or other actions here
}

// Handle "use as context" action
async function handleUseAsContext(text: string, context: { url: string; title: string }) {
  // Store selected text as context for template creation
  await chrome.storage.session.set({
    templateContext: {
      selectedText: text,
      context,
      timestamp: Date.now(),
    }
  });
  
  // Open popup for template selection
  chrome.action.openPopup();
}

// Handle "create template" action
async function handleCreateTemplate(text: string, context: { url: string; title: string }) {
  // Store selected text for template creation
  await chrome.storage.session.set({
    createTemplate: {
      suggestedContent: text,
      context,
      timestamp: Date.now(),
    }
  });
  
  // Open popup in edit mode
  chrome.action.openPopup();
}

// Handle quick access request
async function handleQuickAccess() {
  // Get frequently used templates
  const templates = await storage.getTemplates();
  const frequentTemplates = Object.values(templates)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5);
    
  // Store for popup
  await chrome.storage.session.set({
    quickAccess: {
      templates: frequentTemplates,
      timestamp: Date.now(),
    }
  });
  
  chrome.action.openPopup();
}

// Handle template editing request
async function handleEditTemplate(templateId: string) {
  await chrome.storage.session.set({
    editTemplate: {
      templateId,
      timestamp: Date.now(),
    }
  });
  
  chrome.action.openPopup();
}

// Handle template execution from context
async function handleExecuteTemplate(templateId: string, context: { url: string; title: string }, tab?: chrome.tabs.Tab) {
  const template = await storage.getTemplate(templateId);
  if (!template) return;
  
  // If template has no variables, execute immediately
  if (template.variables.length === 0) {
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'insertText',
        text: template.content,
      });
    }
    
    // Track usage
    template.usageCount++;
    await storage.saveTemplate(template);
  } else {
    // Store template for variable input
    await chrome.storage.session.set({
      executeTemplate: {
        template,
        context,
        timestamp: Date.now(),
      }
    });
    
    chrome.action.openPopup();
  }
}

// Initialize extension with default data
async function initializeExtension() {
  try {
    const templates = await storage.getTemplates();
    
    // If no templates exist, create a sample template
    if (Object.keys(templates).length === 0) {
      const sampleTemplate = {
        id: 'sample-1',
        name: 'Email Introduction',
        content: 'Hello {{NAME}},\n\nI hope this email finds you well. I wanted to reach out regarding {{TOPIC}}.\n\nBest regards,\n{{YOUR_NAME}}',
        variables: [
          { name: 'NAME', type: 'text' as const, required: true, description: 'Recipient name' },
          { name: 'TOPIC', type: 'text' as const, required: true, description: 'Email topic' },
          { name: 'YOUR_NAME', type: 'text' as const, required: true, description: 'Your name' },
        ],
        category: 'email',
        tags: ['email', 'introduction'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
        favorite: false,
      };
      
      await storage.saveTemplate(sampleTemplate);
    }
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }
}

// Update context menus based on templates
async function updateContextMenus() {
  try {
    // Remove existing items
    await chrome.contextMenus.removeAll();
    
    // Re-create base menu
    chrome.contextMenus.create({
      id: 'prompt-templates',
      title: 'Prompt Templates',
      contexts: ['selection', 'editable'],
    });
    
    // Add favorite templates as submenu items
    const templates = await storage.getTemplates();
    const favorites = Object.values(templates)
      .filter(t => t.favorite)
      .slice(0, 10); // Limit to 10 favorites
    
    if (favorites.length > 0) {
      for (const template of favorites) {
        chrome.contextMenus.create({
          id: `template-${template.id}`,
          parentId: 'prompt-templates',
          title: template.name,
          contexts: ['selection', 'editable'],
        });
      }
      
      chrome.contextMenus.create({
        id: 'separator',
        parentId: 'prompt-templates',
        type: 'separator',
        contexts: ['selection', 'editable'],
      });
    }
    
    chrome.contextMenus.create({
      id: 'open-all',
      parentId: 'prompt-templates',
      title: 'View All Templates...',
      contexts: ['selection', 'editable'],
    });
  } catch (error) {
    console.error('Failed to update context menus:', error);
  }
} 