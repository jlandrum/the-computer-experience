/**
 * @class MacDesktop
 * @extends HTMLElement
 * @description Represents the desktop of the macOS system.
 */
class MacDesktop extends HTMLElement {
  /** The singleton instance of desktop */
  static #desktop;

  constructor() {
    super();
    // Block multiple desktops
    if (MacDesktop.#desktop) {
      throw new Error('Only one desktop allowed');
    }
    MacDesktop.#desktop = this;
  }

  connectedCallback() {
    this.addEventListener('mousedown', this.onWallpaperClicked); 
  }

  disconnectedCallback() {
    this.removeEventListener('mousedown', this.onWallpaperClicked);
  }

  onWallpaperClicked = (e) => {
    MacDesktop.focusDesktop(e);
  }

  /** Focuses the desktop, removing focus from all apps */
  static focusDesktop(e) {
    // If the target is the desktop, blur all applications
    if (e.target instanceof UIIcons && e.target.hasAttribute('desktop')) {
      MacApplication.blurAll();
      MacApplication.focus('finder');
    }
  }

  static showLoadError(appName) {
    const template = document.getElementById('load-error').content;
    const error = template.cloneNode(true);
    error.querySelector('.app-name').textContent = appName;
    MacDesktop.#desktop.appendChild(error);
  }

  static appendChild(child) {
    MacDesktop.#desktop.appendChild(child);
  }

  static get desktop() { return MacDesktop.#desktop; }
}

globalThis.MacDesktop = MacDesktop;

customElements.define('mac-desktop', MacDesktop);
