import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { StaffSessionProvider } from './auth/StaffSession';
import { App } from './app/App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StaffSessionProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StaffSessionProvider>
  </React.StrictMode>,
);
