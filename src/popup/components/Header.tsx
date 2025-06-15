import React from 'react';

interface HeaderProps {
  onNewTemplate: () => void;
  onOpenManager: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewTemplate, onOpenManager }) => {
  return (
    <header className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          Templates
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewTemplate}
            className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            title="Create new template"
          >
            + New
          </button>
          <button
            onClick={onOpenManager}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            title="Open full template manager"
          >
            Open Manager
          </button>
        </div>
      </div>
    </header>
  );
}; 