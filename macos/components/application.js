/**
 * @class MacApplication
 * @extends HTMLElement
 * A container component that represents an application in the Mac OS system.
 * Applications are expected to be loaded from the server and are expected to
 * provide a name and a newWindow method. 
 */
class MacApplication extends HTMLElement {
  /** @type {EventTarget} Handles events to the actively listening application */
  static #eventBus = new EventTarget();
  /** @type {MacApplication} The currently active application */
  static #activeApplication;
  /** @type {Process[]} Holds references to running "applications" */
  static #processes = [];
  /** @type {[]} Holds behaviors; once an application is loaded, it does not need to be loaded again */  
  static #behaviors = [];

  #menu;
  #isFocused;

  constructor() {
    super();
  }

  connectedCallback() {
    this.#menu = this.querySelector('menu-segment');
    this.classList.add('mac-application');
    this.addEventListener('mousedown', this.onMouseDown);
    FinderApp?.setFileState(this.invokeName, true);
  }
  
  onMouseDown = (e) => {
    // Focus the application
    this.focus();
    // If the target is a window, set it as the active window
  }

  static focus = (app) => {
    const application = MacApplication.#processes.find(p => p.name === app || p.invokeName === app)?.application;
    if (application) {
      application.focus();
    } else {
      console.warn('Application not found', app);
    }
  }
  
  focus = () => {
    // If already focused, return
    if (MacApplication.#activeApplication === this) return;
    
    // Blur all other applications
    MacApplication.blurAll(this);

    MacApplication.#activeApplication = this;
    MacApplication.#eventBus.addEventListener('action', this.#onAction);
    MenuBar.replaceSegment(this.#menu);
    this.#isFocused = true;
  }

  /**
   * Focuses the last window in the stack
   * @returns {void}
   */
  focusNext = () => {
    this.getWindowControllers().reverse?.()?.[0]?.focus?.();
  }

  blur = () => {
    // Ensure all windows are blurred
    this.getWindowControllers().forEach(w => w.blur());

    // If not focused, return
    if (MacApplication.#activeApplication !== this) return;
 
    // Blur the application
    MacApplication.#eventBus.removeEventListener('action', this.#onAction);
    MacApplication.#activeApplication = null;
    this.#isFocused = false;
  }

  get activeWindow() { return this.getWindowControllers().find(w => w.isFocused) }

  getWindowControllers = () => {
    return Array.from(this.childNodes).filter(c => c instanceof MacWindowController);
  }

  #onAction = (e) => {
    const { source, action, ...detail } = e.detail;
    Array.prototype.act = function() {
      if (this[0] === source && this[1] === action) {
        this[2]?.(detail);
      }
    } 
    this.onAction(source, action, detail);
    Array.prototype._act = undefined;
  }
  
  /** Applications should provide a getter to get the name. This should NOT change 
   * through the life of the application 
   * @abstract
   * @function
   * @returns {string} The name of the application */
  get name() { throw new Error('Application MUST provide a name') }
  
  /** Applications are expected to handle when a new window request is made 
   * @abstract
   * @function
   * @param {object} args Any arguments passed to the new window
   * @returns {MacWindowController} The host for the new window
  */
  newWindow = () => { throw new Error('Application MUST provide a newWindow method') }

  /** Applications should handle events from UI events */
  onAction = () => { console.warn(this, 'Application did not provide an onAction method') }

  /** The icon for the application
   * @returns {string} The path to the icon
   */
  get icon() { throw new Error('Application MUST provide an icon') }

  get isFocused() { return this.#isFocused }

  /**
   * Exits the application
   * This will close all windows and remove the application from the desktop
   * If the application is the last application, the desktop will be focused
   * @returns {void}
   */
  exit = () => {
    // Close all windows
    this.getWindowControllers().forEach(w => w.close());
    // Remove the script for the process and the process from the list
    const index = MacApplication.#processes.findIndex(p => p.application === this);
    MacApplication.#processes[index].script?.remove();
    MacApplication.#processes.splice(index, 1);
    // Focus the previous process
    MacApplication.#processes[MacApplication.#processes.length - 1]?.application.focus();
    // Remove from Finder
    FinderApp.setFileState(this.invokeName, false);
    // Remove the application
    this.remove();
  }

  notifyWindowsChanged = () => {
    MacApplication.emit('application', 'windows-changed', { windowControllers: this.getWindowControllers() });
  }

  /** Emits an event to the event bus 
   * @param {string} source The source of the event
   * @param {string} action The action to perform
   * @param {object} extra Any extra data to include
  */
  static emit = (source, action, extra = {}) => {
    MacApplication.#eventBus.dispatchEvent(new CustomEvent('action', { detail: { source, action, ...extra } }));
  }

  /** Blurs all applications */
  static blurAll = (exclude) => {
    MacApplication.#processes.forEach(p => {
      if (p.application !== exclude) p.application.blur()
    });
    this.#activeApplication = null;
  }

  /**
   * Opens a new application
   * @param {string} app The name of the app to open. 
   * @param {MacApplication} parent When this application is closed, focus this application
   * @returns A promise that resolves to the opened app
   */
  static async spawn(app, args = {}) {
    const existingProcess = MacApplication.#processes.find(p => p.invokeName === app);
    if (existingProcess) {
      existingProcess.application.focus();
      if (!args.background) {
        existingProcess.application.newWindow(args);
      }
      return existingProcess.application;
    }

    // Loads the app from the server
    return fetch(`apps/${app}/index.html`).then(response => response.text()).then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const appInstance = doc.querySelector('template').content.firstElementChild.cloneNode(true);

      const appCode = doc.querySelector('script:not([src])')?.textContent;
      const scriptEl = appCode ? (()=>{
        const el = document.createElement('script');
        el.textContent = appCode;
        return el;
      })() : null;

      return new Promise((resolve) => {
        if (scriptEl && !MacApplication.#behaviors.includes(app)) {
          scriptEl.callback = resolve;
          scriptEl.textContent += 'document.currentScript.callback(); document.currentScript.remove()';
          scriptEl.addEventListener('load', resolve);
          document.body.appendChild(scriptEl);
          MacApplication.#behaviors.push(app);
        } else {
          resolve();
        }
      }).then(() => {        
        appInstance.invokeName = app;
        MacDesktop.appendChild(appInstance);
        MacApplication.#processes.push(new Process(appInstance, app));
        if (!args.background) {
          appInstance.newWindow(args);
        }
        appInstance.focus();

        return appInstance;  
      })
    }).catch((e) => {
      console.error('Failed to load app', app, e.stack);
      this.showDialog(`The application program ${app} could not be opened, because an error of type -39 occured.`);
      throw new Error('Failed to load app');
    });
  }

  /**
   * Creates a new window using a defined template within the application
   * @param {string} template The name of the template to spawn
   */
  spawnWindowFromTemplate = (template) => {
    const windowContainer = this.querySelector('template[window="' + template + '"]').content.firstElementChild;
    if (!windowContainer) {
      throw new Error('Template not found: ' + template);
    } else if (!windowContainer instanceof MacWindowController) {
      console.warn('Template root should be a class that extends MacWindowController', template);
    }

    const window = windowContainer.cloneNode(true);
    this.appendChild(window);
    return window;
  }

  /** 
   * Creates and shows a dialog window
   */
  showDialog = (text, extra, callback) => { MacApplication.showDialog(text, extra, callback) }
  static showDialog = (text, extra, callback) => {
    const template = `
        <mac-window-chrome titleless></mac-window-chrome>
        <mac-window-content>
          <div class="text">
            ${text}
          </div>
        </mac-window-content>`
    
    const controller = document.createElement('mac-window-controller');
    const dialog = document.createElement('mac-window');
    dialog.setAttribute('width', '220');
    dialog.setAttribute('height', 'auto');
    dialog.setAttribute('modal', '');
    dialog.classList.add('default-dialog');
    
    dialog.innerHTML = template;
    controller.appendChild(dialog);
    MacDesktop.appendChild(controller);

    const content = dialog.querySelector('mac-window-content'); 
    const actions = extra?.actions || { ok: 'OK' };

    Object.keys(actions).forEach(key => {
      const button = document.createElement('ui-button');
      button.setAttribute('key', key);
      button.textContent = actions[key];
      button.addEventListener('click', () => {
        callback?.(key);
        dialog.close();
      });
      content.appendChild(button);
    });
  }

  // Get all the processes
  static get processes() { return MacApplication.#processes }

  // Get the active application name
  static get activeApplication() { return MacApplication.#activeApplication?.name || 'Finder' }

  // Get the active application icon
  static get activeAppIcon() { return MacApplication.#activeApplication?.icon || 'icons/finder.png' }

  /**
   * Opens a file with the associated application
   * @param {string} path The full path to the file to open 
   */
  static openFile = (file) => {
    const ext = file.split('/').reverse()[0].split('.')?.[1] || 'txt';
    switch (ext) {
      case 'txt':
        MacApplication.spawn('simple-text', { file });
        break;
      case 'png':
      case 'jpg':
      case 'jpeg':
        MacApplication.spawn('image-viewer', { file });
        break;
      case 'html':
      case 'htm':
        MacApplication.spawn('web-browser', { file });
        break;
      default:
        MacApplication.showDialog('Unknown file type', { actions: { ok: 'OK' } });
    }
  }
}

globalThis.MacApplication = MacApplication;

customElements.define('mac-application', MacApplication);