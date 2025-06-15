import React from 'react';
import { createRoot } from 'react-dom/client';
import { TemplateManager } from './manager';
import '../index.css';

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <TemplateManager />
    </React.StrictMode>
  );
} else {
  console.error('Failed to find the root element to mount the app.');
} 