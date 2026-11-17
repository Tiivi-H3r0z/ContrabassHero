import ReactDOM from 'react-dom/client';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');
const root = ReactDOM.createRoot(rootElement);

// ?v=1 pixel (original sprites) · ?v=2 neon (3D toon) · ?v=3 carnage · no param: version picker.
const params = new URLSearchParams(location.search);
const v = params.get('v') ?? (params.has('char') ? '3' : null);

if (v === '1') import('./versions/v1/main').then((m) => m.mount(root));
else if (v === '2') import('./versions/v2/main').then((m) => m.mount(root));
else if (v === '3') import('./main3').then((m) => m.mount(root));
else import('./Launcher').then((m) => m.mount(root));
