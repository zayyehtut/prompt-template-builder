// Background service worker for the extension
import { storage } from '@/lib/storage';

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
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'updateContextMenus') {
    updateContextMenus();
  }
  
  return false; // Not keeping the message channel open
});

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