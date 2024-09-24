if (typeof FinderApp === 'undefined') {
  class FinderApp extends MacApplication {
    static #aboutWindow;
    static #openFiles = [];

    constructor() {
      super();
    }

    get name() { return 'Finder' }   
    get icon() { return 'apps/finder/icon.png' }

    newWindow = ({path}) => {
      const existingWindow = this.getWindowControllers().find(window => window.path === path);
      if (existingWindow) {
        existingWindow.focus();
        return existingWindow;
      }
      const window = this.spawnWindowFromTemplate('finder');
      window.path = path;
      FinderApp.#openFiles.push(path);
      return window;
    }

    onAction = (source, action, extra) => {
      ['icon', 'dblclick', () => {
        const type = extra.icon?.getAttribute?.('type');
        switch (type) {
          case 'folder':
            this.newWindow({path: extra.icon.getAttribute('target')});
            break;
          case 'app':
            MacApplication.spawn(extra.icon.getAttribute('target'))
            break;
          default:
            const path = extra.icon.getAttribute('target');
            MacApplication.openFile(path);
        }
      }].act();

      ['menu', 'close', this.activeWindow?.close].act();
      ['menu', 'send-to-trash', this.activeWindow?.sendToTrash].act();
      ['application', 'windows-changed', this.updateState].act();
      ['menu', 'about', this.showAbout].act();
      ['menu', 'new-folder', () => {
        this.activeWindow?.createDir()
      }].act();
    }

    showAbout = () => {
      if (FinderApp.#aboutWindow) {
        FinderApp.#aboutWindow.focus();
        return;
      }
      FinderApp.#aboutWindow = this.spawnWindowFromTemplate('about');
      FinderApp.#aboutWindow.addEventListener('close', () => FinderApp.#aboutWindow = null);
    }

    updateState = () => {
      // Update icons
      const icons = this.querySelectorAll('ui-icons').forEach(it => it.updateState?.());
      // Update menu
      const hasWindows = !!this.getWindowControllers().length;
      MenuBar.updateMenuDropdownItem('[label="Close"]', { disabled: !hasWindows && !!this.activeWindow  });
    }

    /**
     * Sets the state of a file or app in Finder to adjust icons
     * @param {string} target - The path of the file or app
     * @param {boolean} state - Whether the file is open or not
     */
    static setFileState(target, state) {
      if (state) {
        FinderApp.#openFiles.push(target);
      } else {
        FinderApp.#openFiles = FinderApp.#openFiles.filter(file => file !== target);
      }
      document.querySelector('finder-app').updateState();
    }

    static getFileState(target) {
      return FinderApp.#openFiles.includes(target);
    }
  }

  class FinderWindow extends MacWindowController {
    #vdiskExplorer = new VDiskExplorer();
    #path;
    #files;
    #details;
    #selectedIcon;

    constructor() {
      super();
    }

    onClose() {
      FinderApp.setFileState(this.#path, false);
    }

    connectedCallback() {
      this.#details = this.querySelector('[data-id="details"]');
      VDiskExplorer.addEventListener('change', this.updateDisplay);
      this.addEventListener('click', this.onIconClick);
    }

    disconnectedCallback() {
      VDiskExplorer.removeEventListener('change', this.updateDisplay);
      this.removeEventListener('click', this.onIconClick);
    }

    onIconClick = (e) => {
      if (e.target instanceof UIIcon) {
        this.#selectedIcon = e.target;
      }
    }

    sendToTrash = () => {
      if (this.#selectedIcon) {
        this.#vdiskExplorer.rm(this.#selectedIcon.getAttribute('target'));
        this.updateDisplay();
      }
    }

    createDir = () => {
      // TODO: Make a native prompt
      const name = prompt('Enter the name of the new folder');
      if (name) {
        this.#vdiskExplorer.mkdir(name);
        this.updateDisplay();
      }
    }

    set path(value) {
      this.#vdiskExplorer.cd(value);
      this.#path = value;
      this.updateDisplay();
    }

    get path() { return this.#path }

    updateDisplay = () => {
      if (!this.#path) return;
      this.#files = this.#vdiskExplorer.ls();
      this.querySelector('ui-icons').innerHTML = '';
      this.#files.forEach((file, i) => {
        const icon = document.createElement('ui-icon');
        const ext = (file.name.split('/').reverse()[0].split('.')?.[1] || 'txt');
        icon.setAttribute('icon', file instanceof Folder ? 'apps/finder/folder' : `apps/finder/file@${ext}`);
        icon.setAttribute('label', file.name);
        icon.setAttribute('target', this.#path + '/' + file.name);
        icon.setAttribute('type', file instanceof Folder ? 'folder' : 'file');
        icon.setAttribute('x', `${i * 60 + 20}`);
        icon.setAttribute('y', '10');
        this.querySelector('ui-icons').appendChild(icon);
      });
      if (this.#details) {
        this.#details.textContent = `${this.#files.length} items, ${this.#vdiskExplorer.available} available`;
      }
      this.querySelector('mac-window-chrome span').textContent = this.#path.split('/').reverse()[0];
    }
  }

  globalThis.FinderApp = FinderApp;

  customElements.define('finder-app', FinderApp);
  customElements.define('finder-window', FinderWindow);
}