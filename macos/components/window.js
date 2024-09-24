/**
 * @class MacWindow
 * @extends HTMLElement
 * @description A window component for the Mac OS.
 * 
 */
export class MacWindow extends HTMLElement {
  // Props
  #minWidth = 200;
  #maxWidth = 800;
  #minHeight = 200;
  #maxHeight = 600;
  // Elements
  dragOverlay = null;
  #modal = false;
  #modalUnderlay = null;
  #menuSegment;
  #children = [];
  #screenGlare = null;
  #application;
 
  constructor() {
    super();
  }

  get screenGlare() { return this.#screenGlare }

  connectedCallback() {
    this.#screenGlare = document.createElement('mac-screen-glare');
    this.#screenGlare.style.width = '0';
    this.#screenGlare.style.height = '0';
    this.#screenGlare.style.display = 'none';
    document.body.appendChild(this.#screenGlare);
    this.classList.add('mac-window');
    this.#menuSegment = this.querySelector('menu-segment');
    this.addEventListener('mousedown', this.onMouseDown);    
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('mousemove', (e) => this.onMouseMove(e, this));
    this.#maxWidth = this.getAttribute('max-width') || this.#maxWidth;
    this.#minWidth = this.getAttribute('min-width') || this.#minWidth;
    this.#maxHeight = this.getAttribute('max-height') || this.#maxHeight;
    this.#minHeight = this.getAttribute('min-height') || this.#minHeight;
    if (this.hasAttribute('modal')) {
      this.makeModal(); 
    }
    setTimeout(() => {
      if (this.hasAttribute('x') && this.hasAttribute('y')) {
        this.move(this.getAttribute('x'), parseFloat(this.getAttribute('y')) + 21);
      } else {
        this.center();
      }
      this.setAttribute('ready', '');
    }, 1);
    this.resize(this.getAttribute('width') || 320, this.getAttribute('height') || 240);
    this.#application = this.closest('.mac-application');
    this.focus();
    setTimeout(() => {
      this.showOpenAnimation();
    }, 1);
    this.#application?.notifyWindowsChanged();
    window.addEventListener('resize', this.updateGlow);
  }

  disconnectedCallback() {
    this.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize', this.updateGlow);
  }

  onMouseDown = (e) => {
    this.mouseOffset = { x: e.clientX - this.offsetLeft, y: e.clientY - this.offsetTop };
    this.focus();
    if (e.target !== this) return;
    // Create overlay
    this.dragOverlay = document.createElement('mac-window-drag-overlay');
    document.querySelector('mac-desktop').appendChild(this.dragOverlay);    
    this.dragOverlay.style.width = this.clientWidth + 'px';
    this.dragOverlay.style.height = this.clientHeight + 'px';
    this.dragOverlay.style.left = this.offsetLeft + 'px';
    this.dragOverlay.style.top = this.offsetTop + 'px';
    if (this.hasAttribute('resizable') && e.offsetX > this.clientWidth - 20 && e.offsetY > this.clientHeight - 20) {
      this.isResizing = true;
      return;
    } else {
      this.isMoving = true;
    }
  }

  onMouseUp = (e) => {
    if (this.dragOverlay) {
      if (this.isMoving) {
        this.move(this.dragOverlay.offsetLeft, this.dragOverlay.offsetTop);
      } else {
        this.resize(this.dragOverlay.clientWidth, this.dragOverlay.clientHeight);
      }
      this.dragOverlay.remove();
      this.dragOverlay = null;
      this.isMoving = false;
      this.isResizing = false;
    }
  }

  onMouseMove = (e) => {
    const desktop = document.querySelector('mac-desktop');
    if (this.dragOverlay) {
      const newOffsetX = e.clientX - this.mouseOffset.x;
      const newOffsetY = e.clientY - this.mouseOffset.y;
      if (this.isMoving) {
        this.dragOverlay.style.left = newOffsetX + 'px';
        this.dragOverlay.style.top = newOffsetY + 'px';
      } else if (this.isResizing) {
        const newWidth = e.clientX - desktop.offsetLeft - this.offsetLeft;
        const newHeight = e.clientY - desktop.offsetTop - this.offsetTop;
        this.dragOverlay.style.width = Math.max(this.#minWidth, Math.min(this.#maxWidth, newWidth)) + 'px';
        this.dragOverlay.style.height = Math.max(this.#minHeight, Math.min(this.#maxHeight, newHeight)) + 'px';
      }
    }
  }

  /**
   * Focuses the window. 
   * This will adjust the z-index of the window as well as update all
   * windows to ensure the active window is on top without overflowing
   * the z-indexes.
   * 
   * If the window has the attribute `no-focus`, this will return false.
   * 
   * If the window is already focused, or if it becomes focused this will return true.
   * @function
   * @returns {boolean} The focus state of the window
   */
  focus() {
    if (this.hasAttribute('no-focus')) return false;
    document.querySelectorAll('mac-window').forEach(w => w.blur());
    var topZ = MacWindow.zSortWindows();
    this.activeWindow?.blur();
    // Set this and children active  
    this.setAttribute('active', '');
    // Set z-index
    if (!this.hasAttribute('always-on-bottom')) {
      this.style.zIndex = topZ + 2;
    } 
    if (this.hasAttribute('always-on-top')) {
      this.style.zIndex = 1000;
    } 
    if (this.hasAttribute('modal')) {
      this.style.zIndex = 1001;
    }
    // If underlay exists, set z-index
    if (this.#modalUnderlay) {
      this.#modalUnderlay.style.zIndex = 1000;
    }
    // Notify application of focus
    this.#application?.focus();
    return true;
  }

  /** Resizes the window 
   * @function
   * @param {number} w The width of the window
   * @param {number} h The height of the window
   * @returns {void}
  */
  resize = (w, h) => {
    this.style.width = w === "auto" ? "auto" : w + 'px';
    this.style.height = h === "auto" ? "auto" : h + 'px';
    this.updateGlow();
  }

  /** 
   * Moves the window to the specified coordinates
   * @function
   * @param {number} x The x-coordinate
   * @param {number} y The y-coordinate
   * @returns {void}
   * */
  move = (x , y) => {
    this.style.left = x + 'px';
    this.style.top = y + 'px';
    this.updateGlow();
  }

  /** Makes the window inactive
   * @returns {void}
   * */
  blur = () => {
    this.removeAttribute('active');
    this.#children.forEach(w => w.removeAttribute('active'));
  }

  /** Makes the window modal - which requires that the user
   * interact with the window before they can interact with
   * the rest of the desktop.
   * @returns {void}
   */
  makeModal = () => {
    this.#modal = true;
    this.#modalUnderlay = document.createElement('mac-window-underlay');
    MacDesktop.appendChild(this.#modalUnderlay);
  }

  /** Gets if the current window is focused 
   * @returns {boolean} The focus state of the window
  */
  get isFocused() {
    return this.hasAttribute('active');
  }

  /** Centers the window within the desktop
   * @returns {void}
   */
  center() {
    const desktop = document.querySelector('mac-desktop');
    this.move(
      (desktop.clientWidth / 2 - this.clientWidth / 2),
      (desktop.clientHeight / 2 - this.clientHeight / 2));
  }

  // Declare attributes
  static get observedAttributes() {
    return ['title', 'width', 'height'];
  }

  // Handle attribute changes
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'title') {
      this.querySelector('mac-window-chrome').setAttribute('title', newValue);
    } else if (name === 'width') {
      this.resize(newValue, this.clientHeight);
    } else if (name === 'height') {
      this.resize(this.clientWidth, newValue);
    }
  }

  /** Closes the window. With respect to macOS, this will NOT terminate
   * the virtual process, but will simply remove the window from the desktop.
   * @returns {void}
   */
  close = () => {
    this.#modalUnderlay?.remove();
    this.#screenGlare.remove();
    if (this.parentNode instanceof MacWindowController) {
      this.parentNode.remove();
    }
    super.remove();
    this.#application?.focusNext();
    this.#application?.notifyWindowsChanged();
  }

  /** Automatically re-sorts windows' Z-indexes 
   * @returns {number} The number of windows sorted
  */
  static zSortWindows() {
    const windows = Array.from(document.querySelectorAll('mac-window, .mac-window'));
    windows.sort((a, b) => {
      return parseInt(a.style.zIndex) - parseInt(b.style.zIndex);
    });
    windows.forEach((w, i) => {
      if (w.hasAttribute('modal')) {
      } else if (w.hasAttribute('always-on-top')) {
        w.style.zIndex = 1000;
      } else if (w.hasAttribute('always-on-bottom')) {
        w.style.zIndex = 0;
      } else {
        w.style.zIndex = i;
      }
    });
    return windows.length + 1;
  }

  /** Shows the open animation for the window
   * @returns {void}
   */
  showOpenAnimation() {
    this.style.opacity = 0;
    const animOverlay = document.createElement('mac-window-drag-overlay');
    document.querySelector('mac-desktop').appendChild(animOverlay);    
    animOverlay.style.width = this.clientWidth + 'px';
    animOverlay.style.height = this.clientHeight + 'px';
    animOverlay.style.left = this.offsetLeft + 'px';
    animOverlay.style.top = this.offsetTop + 'px';

    animOverlay.style.scale = 0.1;
    animOverlay.style.borderWidth = '20px';

    const interval = setInterval(() => {
      animOverlay.style.scale = parseFloat(animOverlay.style.scale) + 0.1;
      animOverlay.style.borderWidth = 2 / parseFloat(animOverlay.style.scale) + 'px';
    }, 16);

    setTimeout(() => {
      clearInterval(interval);
      animOverlay.remove();
      this.style.opacity = 1;
    }, 160);
  }

  /** Updates the glow of the window
   * @returns {void}
   * */
  updateGlow() {
    setTimeout(() => {
      if (this.screenGlare) {
        this.screenGlare.style.display = 'block';
        
        let clipWidth = Math.max(0, (this.offsetLeft + this.clientWidth) - MacDesktop.desktop.clientWidth) -
                        Math.min(0, this.offsetLeft);
        let clipHeight = Math.max(0, (this.offsetTop + this.clientHeight) - MacDesktop.desktop.clientHeight) -
                        Math.min(0, this.offsetTop);

        let width = this.clientWidth - clipWidth;
        let height = this.clientHeight - clipHeight;

        let x = Math.max(MacDesktop.desktop.offsetLeft, this.offsetLeft + MacDesktop.desktop.offsetLeft);
        let y = Math.max(MacDesktop.desktop.offsetTop, this.offsetTop + MacDesktop.desktop.offsetTop);

        this.screenGlare.style.width = width + 'px';
        this.screenGlare.style.height = height + 'px';
        
        this.screenGlare.style.left = x + 'px';
        this.screenGlare.style.top = y + 'px';
      }
    });
  }

  toggleShade() {
    this.toggleAttribute('shaded');
    this.updateGlow();
  }
}

/**
 * @class MacWindowUnderlay
 * @extends HTMLElement
 * 
 * An underlay for the MacWindow component, used for modal windows.
 * This will prevent the user from interacting with the desktop until
 * the window is closed.
 * 
 * @description An underlay for the MacWindow component
 */
class MacWindowUnderlay extends HTMLElement {
  constructor() {
    super();    
  }

  connectedCallback() {
    this.addEventListener('mousedown', this.onMouseDown);
  }

  disconnectedCallback() {
    this.removeEventListener('mousedown', this.onMouseDown);
  }

  onMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    AudioPlayer.play('slte');
  }
}

/**
 * @class MacWindowController
 * @extends HTMLElement
 * A utility class that holds a window and manages some of its behaviors.
 */
class MacWindowController extends HTMLElement {
  constructor() {
    super();
  }

  focus = () => {
    this.querySelector('mac-window').focus();
    this.onFocus?.();
  }

  close = () => {
    this.querySelector('mac-window').close();
    this.onClose?.();
  }

  blur = () => {
    this.querySelector('mac-window').blur();
    this.onBlur?.();
  }

  get isFocused() {
    return this.querySelector('mac-window').isFocused;
  }
}

class MacExternalWindowController extends MacWindowController {
  constructor() {
    super();
  }

  connectedCallback() {
    MacApplication.activeApplication.setDelegate(this);
  }

  onFocus() {
    MacApplication.activeApplication.setDelegate(this);
  }

  onClose() {
    if (MacApplication.activeApplication.delegate === this) {
      MacApplication.activeApplication.setDelegate(null);
    }
  }
}

class ChromeCollapse extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('click', this.onClick);
  }

  onClick = () => {
    this.closest('mac-window').toggleShade();
  }
}

class ChromeClose extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('click', this.onClick);
  }

  onClick = () => {
    this.closest('mac-window').parentElement.close();
  }
}

globalThis.MacWindow = MacWindow;
globalThis.MacWindowUnderlay = MacWindowUnderlay;
globalThis.MacWindowController = MacWindowController;
globalThis.MacExternalWindowController = MacExternalWindowController;

globalThis.ChromeCollapse = ChromeCollapse;
globalThis.ChromeClose = ChromeClose;

customElements.define('mac-window', MacWindow);
customElements.define('mac-window-underlay', MacWindowUnderlay);
customElements.define('mac-window-controller', MacWindowController);

customElements.define('chrome-collapse', ChromeCollapse);
customElements.define('chrome-close', ChromeClose);