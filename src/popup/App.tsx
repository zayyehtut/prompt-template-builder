import React, { useState, useEffect } from 'react';
import type { Template } from '@/types/storage';
import { storage } from '@/lib/storage';

function App() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const allTemplates = await storage.getTemplates();
      setTemplates(Object.values(allTemplates));
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-96 h-96 flex items-center justify-center">
        <div className="text-gray-600">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="w-96 h-96 bg-white">
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Prompt Templates</h1>
        
        {templates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No templates yet</p>
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Create Your First Template
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
              >
                <h3 className="font-medium">{template.name}</h3>
                <p className="text-sm text-gray-600 truncate">
                  {template.content.substring(0, 100)}...
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 