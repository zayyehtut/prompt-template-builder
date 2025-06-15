import type { Template, UserSettings, ExecutionRecord } from '@/types/storage';

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

  // Template management
  async saveTemplate(template: Template): Promise<void> {
    const templates = await this.getTemplates();
    template.updatedAt = Date.now();
    templates[template.id] = template;
    await chrome.storage.local.set({ templates });
  }

  async getTemplate(id: string): Promise<Template | null> {
    const templates = await this.getTemplates();
    return templates[id] || null;
  }

  async getTemplates(): Promise<Record<string, Template>> {
    const { templates = {} } = await chrome.storage.local.get('templates');
    return templates;
  }

  async deleteTemplate(id: string): Promise<void> {
    const templates = await this.getTemplates();
    delete templates[id];
    await chrome.storage.local.set({ templates });
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
    await chrome.storage.sync.set({ settings });
  }

  async getSettings(): Promise<UserSettings> {
    const { settings = this.getDefaultSettings() } = await chrome.storage.sync.get('settings');
    return settings;
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


}

// Export singleton instance
export const storage = ExtensionStorage.getInstance(); 