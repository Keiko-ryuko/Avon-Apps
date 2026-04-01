import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { FirebaseProvider } from './components/auth/FirebaseProvider.tsx';

console.log('App starting...');
createRoot(document.getElementById('root')!).render(
  <FirebaseProvider>
    <App />
  </FirebaseProvider>
);
