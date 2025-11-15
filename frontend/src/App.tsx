import { useState, useEffect } from 'react';
import './App.css';

interface BackendStatus {
  message?: string;
  connected?: boolean;
  error?: string;
}

function App() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/test')
      .then(res => res.json())
      .then(data => {
        setBackendStatus(data);
        setIsLoading(false);
      })
      .catch(err => {
        setBackendStatus({ error: err.message });
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>📮 Fam Mail</h1>
        <p className="tagline">Send postcards to the people you love</p>
      </header>

      <main className="main">
        <div className="status-card">
          <h2>Backend Connection Status</h2>
          {isLoading ? (
            <p className="loading">Connecting to backend...</p>
          ) : backendStatus.connected ? (
            <div className="success">
              <p className="status-icon">✅</p>
              <p>{backendStatus.message}</p>
              <p className="status-text">Frontend and backend are communicating successfully!</p>
            </div>
          ) : (
            <div className="error">
              <p className="status-icon">❌</p>
              <p>Failed to connect to backend</p>
              <p className="error-message">{backendStatus.error}</p>
            </div>
          )}
        </div>

        <div className="info-card">
          <h2>Getting Started</h2>
          <p>This is a starter template for Fam Mail. The project structure includes:</p>
          <ul>
            <li>✅ Bun backend with TypeScript</li>
            <li>✅ Vite + React frontend with TypeScript</li>
            <li>✅ Docker support for easy deployment</li>
            <li>✅ pnpm workspace configuration</li>
            <li>⏳ PostGrid API integration (coming soon)</li>
            <li>⏳ Postcard creation UI (coming soon)</li>
          </ul>
        </div>

        <div className="next-steps">
          <h2>Next Steps</h2>
          <ol>
            <li>Get your PostGrid API key from <a href="https://www.postgrid.com/" target="_blank" rel="noopener noreferrer">postgrid.com</a></li>
            <li>Add your API key to <code>backend/.env</code></li>
            <li>Build the postcard creation form</li>
            <li>Integrate with PostGrid API</li>
            <li>Deploy with Docker!</li>
          </ol>
        </div>
      </main>

      <footer className="footer">
        <p>Built with ❤️ for keeping in touch</p>
      </footer>
    </div>
  );
}

export default App;
