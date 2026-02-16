import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

try {
    const root = document.getElementById("root");
    if (!root) throw new Error("Root element not found");

    createRoot(root).render(<App />);
    console.log("🚀 Application mounted successfully");
} catch (e) {
    console.error("🔥 Critical Error mounting application:", e);
    document.body.innerHTML = `<div style="color:red; padding:20px;"><h1>Critical Error</h1><p>${e}</p></div>`;
}
