import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/dm-sans';
import '@fontsource/ibm-plex-mono/latin-400.css';
import './styles.css';
import {App} from './App';
import {watchScrollHints} from './scrollHints';

watchScrollHints();
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
