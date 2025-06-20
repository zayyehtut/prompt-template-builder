import { Template, ManagerContext } from '../types/template';
import { Theme } from '@/hooks/useTheme';

interface UserSettings {
  theme: Theme | 'system';
  defaultCategory: string;
  enableShortcuts: boolean;
  autoClose: boolean;
  syncEnabled: boolean;
}

interface ExecutionRecord {
  id: string;
  templateId: string;
  templateName: string;
  variables: Record<string, any>;
  output: string;
  executedAt: number;
  context?: {
    url?: string;
    selectedText?: string;
  };
}

/**
 * Extension storage management with chrome.storage API
 */
export class ExtensionStorage {
  private static instance: ExtensionStorage;
  
  public static getInstance(): ExtensionStorage {
    if (!ExtensionStorage.instance) {
      ExtensionStorage.instance = new ExtensionStorage();
    }
    return ExtensionStorage.instance;
  }

  private STORAGE_KEYS = {
    TEMPLATES: 'templates',
    SETTINGS: 'settings',
    EXECUTION_HISTORY: 'execution_history',
  };

  // Template management
  async saveTemplate(template: Template): Promise<void> {
    try {
      const templates = await this.getTemplates();
      templates[template.id] = template;
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.TEMPLATES]: templates
      });
    } catch (error) {
      console.error('Failed to save template:', error);
      throw error;
    }
  }

  async getTemplate(id: string): Promise<Template | null> {
    try {
      const templates = await this.getTemplates();
      return templates[id] || null;
    } catch (error) {
      console.error('Failed to get template:', error);
      return null;
    }
  }

  async getTemplates(): Promise<Record<string, Template>> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.TEMPLATES);
      return result[this.STORAGE_KEYS.TEMPLATES] || {};
    } catch (error) {
      console.error('Failed to get templates:', error);
      return {};
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const templates = await this.getTemplates();
      delete templates[id];
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.TEMPLATES]: templates
      });
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  }

  // Search templates using basic text matching
  async searchTemplates(query: string): Promise<Template[]> {
    const templates = await this.getTemplates();
    const searchTerm = query.toLowerCase();
    
    return Object.values(templates).filter(template => 
      template.name.toLowerCase().includes(searchTerm) ||
      template.content.toLowerCase().includes(searchTerm) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  // Settings management
  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      await chrome.storage.sync.set({
        [this.STORAGE_KEYS.SETTINGS]: settings
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  async getSettings(): Promise<UserSettings> {
    try {
      const result = await chrome.storage.sync.get(this.STORAGE_KEYS.SETTINGS);
      return result[this.STORAGE_KEYS.SETTINGS] || this.getDefaultSettings();
    } catch (error) {
      console.error('Failed to get settings:', error);
      return this.getDefaultSettings();
    }
  }

  private getDefaultSettings(): UserSettings {
    return {
      theme: 'system',
      defaultCategory: 'personal',
      enableShortcuts: true,
      autoClose: false,
      syncEnabled: false,
    };
  }

  // History management (simplified to use chrome.storage.local for now)
  async addToHistory(record: ExecutionRecord): Promise<void> {
    try {
      const { history = [] } = await chrome.storage.local.get('history');
      history.push(record);
      
      // Keep only last 100 records
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }
      
      await chrome.storage.local.set({ history });
    } catch (error) {
      console.error('Failed to add to history:', error);
    }
  }

  async getHistory(limit: number = 50): Promise<ExecutionRecord[]> {
    try {
      const { history = [] } = await chrome.storage.local.get('history');
      return history.slice(-limit).reverse();
    } catch (error) {
      console.error('Failed to get history:', error);
      return [];
    }
  }

  // Utility methods
  async exportTemplates(): Promise<string> {
    try {
      const templates = await this.getTemplates();
      return JSON.stringify(templates, null, 2);
    } catch (error) {
      console.error('Failed to export templates:', error);
      throw error;
    }
  }

  async importTemplates(jsonData: string): Promise<number> {
    try {
      const importedTemplates = JSON.parse(jsonData);
      const existingTemplates = await this.getTemplates();
      
      let importCount = 0;
      for (const template of Object.values(importedTemplates) as Template[]) {
        if (template.id && template.name && template.content !== undefined) {
          existingTemplates[template.id] = template;
          importCount++;
        }
      }
      
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.TEMPLATES]: existingTemplates
      });
      
      return importCount;
    } catch (error) {
      console.error('Failed to import templates:', error);
      throw error;
    }
  }

  // Clear all data (for development/testing)
  async clearAll(): Promise<void> {
    try {
      await chrome.storage.local.clear();
      await chrome.storage.sync.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }

  // Get storage usage
  async getStorageUsage(): Promise<{ local: number; sync: number }> {
    try {
      const localUsage = await chrome.storage.local.getBytesInUse();
      const syncUsage = await chrome.storage.sync.getBytesInUse();
      return { local: localUsage, sync: syncUsage };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { local: 0, sync: 0 };
    }
  }

  // Open the full template manager page
  async openManager(context?: Record<string, any>): Promise<void> {
    try {
      let managerUrl = chrome.runtime.getURL('src/pages/manager.html');
      
      // If context is provided, store it in session storage for the manager to pick up
      if (context) {
        await chrome.storage.session.set({ managerContext: context });
      }
      
      // Check if a manager tab is already open
      const tabs = await chrome.tabs.query({ url: managerUrl });
      
      if (tabs.length > 0 && tabs[0].id) {
        // If it's open, just focus it
        await chrome.tabs.update(tabs[0].id, { active: true });
        if (tabs[0].windowId) {
            await chrome.windows.update(tabs[0].windowId, { focused: true });
        }
      } else {
        // Otherwise, create a new tab
        await chrome.tabs.create({ url: managerUrl });
      }
    } catch (error) {
      console.error('Failed to open template manager:', error);
    }
  }

  // === Settings Management ===
  async getTheme(): Promise<Theme> {
    try {
      const { settings } = await chrome.storage.sync.get('settings');
      // Fallback for old settings that might not have a theme
      return settings?.theme || 'dark';
    } catch (error) {
      console.error('Failed to get theme:', error);
      return 'dark'; // Default theme
    }
  }

  async setTheme(theme: Theme): Promise<void> {
    try {
      const settings = await this.getSettings();
      await this.saveSettings({ ...settings, theme });
    } catch (error) {
      console.error('Failed to set theme:', error);
    }
  }

  // === Context Management ===
  async setManagerContext(context: ManagerContext): Promise<void> {
    try {
      await chrome.storage.session.set({ managerContext: context });
    } catch (error) {
      console.error('Failed to set manager context:', error);
    }
  }
}

// Export singleton instance
export const storage = ExtensionStorage.getInstance(); 