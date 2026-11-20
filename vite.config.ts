import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { mvrtGitBridge } from './server/mvrtGitBridge';

export default defineConfig({
  plugins: [react(), tailwindcss(), mvrtGitBridge()]
});
