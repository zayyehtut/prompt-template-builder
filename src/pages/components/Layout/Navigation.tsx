import React from 'react';

interface NavigationProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  onNewTemplate: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  theme,
  onThemeToggle,
  searchQuery,
  onSearch,
  onNewTemplate,
}) => {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="logo">
          <span>📝</span>
          <span>Template Manager</span>
        </div>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search templates..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>
      
      <div className="navbar-right">
        <button
          className="btn btn-secondary btn-sm"
          onClick={onNewTemplate}
          title="Create new template (Cmd+N)"
        >
          <span>+</span>
          New Template
        </button>
        
        <button
          className="icon-btn"
          onClick={onThemeToggle}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </nav>
  );
}; 