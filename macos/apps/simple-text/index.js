if (typeof __simple_text === 'undefined') {
  globalThis.__simple_text = true;
  class SimpleText extends MacApplication {
    constructor() {
      super();
    }
    
    get name() { return 'SimpleText' }

    get icon() { return 'apps/simple-text/icon.png' }

    onAction = () => {
      ['menu', 'new', this.newWindow].act();
      ['menu', 'quit', this.exit].act();
      ['menu', 'open', () => {
        lib['file-picker'].showOpenFile().then(file => {
          this.newWindow({file, thisWindow: true });
        })
      }].act();
      ['menu', 'save-as', () => {
        lib['file-picker'].showSaveFile().then(file => {
          file.write(this.activeWindow.text);
          this.activeWindow.openFile(file);
        });
      }].act();
      ['menu', 'save', () => {
        this.activeWindow.save()
      }].act();
      ['menu', 'about', () => this.showDialog('SimpleText')].act();
    }

    newWindow = (args) => {
      if (args?.file) {
        let targetFile = args.file;
        const activeWindowForFile = this.getWindowControllers()
          .find(window => window.activeFile !== undefined && 
                window.activeFile.path === (targetFile?.path || targetFile));

        if (activeWindowForFile) {
          activeWindowForFile.focus();
          return;
        }

        if (!(args.file instanceof File)) {
          targetFile = (new VDiskExplorer()).getFile(args.file);
        }

        if (args.thisWindow) { 
          this.activeWindow.openFile(targetFile);
        } else {
          const newWindow = this.spawnWindowFromTemplate('editor');
          newWindow.openFile(targetFile);
        }
      } else {
        this.spawnWindowFromTemplate('editor');
      }
    }
  }

  class EditorWindow extends MacWindowController {
    #activeFile;
    #changed;
    #textArea;

    constructor() {
      super();
    }

    get changed() {
      return this.#changed;
    }

    set changed(v) {
      MenuBar?.updateMenuDropdownItem?.('[action="save"]', { disabled: !v });
      this.#changed = v;
    }

    connectedCallback() {
      this.#textArea = this.querySelector('textarea');
      this.#textArea.addEventListener('input', () => {
        this.changed = true;
      });
      setTimeout(() => {
        this.changed = false;
      });
    }

    openFile(file) {
      // Unload the previous file
      if (this.#activeFile) {
        FinderApp?.setFileState?.(this.#activeFile?.path, false);
      }
      // Load the new file
      this.#activeFile = file;
      this.querySelector('textarea').value = file.read();
      this.querySelector('span').textContent = file.name;
      FinderApp?.setFileState?.(this.#activeFile?.path, true);
    }

    onClose() {
      FinderApp?.setFileState?.(this.#activeFile?.path, false);
    }

    save() {
      if (!this.changed) return;
      if (this.#activeFile) {
        this.#activeFile.write(this.text);
        this.changed = false;
      } else {
        lib['file-picker'].showSaveFile().then(file => {
          file.write(this.text);
          this.openFile(file);
          this.changed = false;
        });
      }
    }
    
    get activeFile() {
      return this.#activeFile;
    }

    get text() {
      return this.#textArea.value;
    }
  }

  customElements.define('editor-window', EditorWindow);
  customElements.define('app-simple-text', SimpleText);
}