// Creates a place for UI to be loaded in.
const libUiLib = document.createElement('div');
const libUiStyle = document.createElement('style');
libUiLib.style.display = 'none';
document.head.appendChild(libUiStyle);

// Setup core lib functions
globalThis.lib = {
  loadUi: (url) => fetch(url)
    .then(response => response.text())
    .then(html => {
      if (url.endsWith('.css')) {
        libUiStyle.innerHTML += html;
        return;
      } else if (url.endsWith('.html')) {
        libUiLib.innerHTML += html;
        libUiLib.querySelectorAll('script').forEach(script => script.remove());
        return;
      }
    }),
  openWindow: (name) => {
    const window = libUiLib.querySelector(`template[window="${name}"]`);
    if (!window) {
      console.warn('Window not found', `template[window="${name}"]`, 'in', libUiLib);
      return;
    }
    return libUiLib.querySelector(`template[window="${name}"]`).content.querySelector('*').cloneNode(true);
  }
};

import('./file-picker/file-picker.js');
