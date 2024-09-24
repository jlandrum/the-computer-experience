lib.loadUi('./lib/file-picker/file-picker.html');
lib.loadUi('./lib/file-picker/file-picker.css');

class RootFileController extends MacExternalWindowController {
  #vdiskExplorer = new VDiskExplorer(MacintoshHD);
  pathDropdown;
  filesList;
  
  constructor() {
    super();
  }

  get vdiskExplorer() { return this.#vdiskExplorer }

  updateUi = () => {
    if (this.input) {
      if (this.input.value && this.#vdiskExplorer.isWritable) {
        this.querySelector('ui-button[action="save"]').removeAttribute('disabled');
      } else {
        this.querySelector('ui-button[action="save"]').setAttribute('disabled', 'true');
      }  
    }
  }

  updateFileUi = () => {
    this.pathDropdown.setItems(this.cwdToSelect, it => it);
    this.filesList.setItems(this.#vdiskExplorer.ls(), it => {
      return { label: `${it.name}`, value: it }
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this.pathDropdown = this.querySelector('ui-dropdown');
    this.filesList = this.querySelector('ui-list');
    this.#vdiskExplorer.addEventListener('change', this.updateFileUi);
    // TODO: The component is not being recognized as an instance of UIDropdown until after a timeout.
    setTimeout(() => {
      this.updateUi();
      this.updateFileUi();
    }, 1);
  }
  
  /**
   * Given an array of folders, return { label: string, value: string } for each folder
   * where each value is '../' for every level
   * @returns {Array<{ label: string, value: string }>}
   */
  get cwdToSelect() {
    const tree = this.#vdiskExplorer.cwd.split('/').filter(Boolean);
    return tree.map((folder, i) => {
      return { label: folder, value: '../'.repeat(tree.length - i - 1) }
    }).reverse();
  }
}

class OpenFileController extends RootFileController {
  onAction(action, event, data) {
    ['button', 'cancel', this.close].act();
    ['button', 'desktop', () => {
      this.vdiskExplorer.cd('/Desktop');
    }].act();
    ['list', 'files', (args) => {
      if (args.doubleClick) {
        if (args.value instanceof Folder) {
          this.vdiskExplorer.cd(args.value.name);
        } else {
          this.dispatchEvent(new CustomEvent('select', { detail: args.value }));
          this.close();
        }
      }
    }].act();
    ['dropdown', 'path', (args) => {
      this.vdiskExplorer.cd(args.value);
    }].act();
    
    return true;
  }

  updateUi() {
    this.pathDropdown.setItems(this.cwdToSelect, it => it);
    this.filesList.setItems(this.vdiskExplorer.ls(), it => {
      return { label: `${it.name}`, value: it }
    });
  }
}

class SaveFileController extends RootFileController {
  input;

  connectedCallback() {
    super.connectedCallback();
    this.input = this.querySelector('input');
    this.input.addEventListener('input', (e) => {
      this.updateUi();
      this.filesList.blur();
    });
  }

  onAction(action, event, data) {
    ['button', 'cancel', this.close].act();
    ['button', 'save', this.attemptWrite].act();
    ['button', 'desktop', () => {
      this.vdiskExplorer.cd('/Desktop');
    }].act();
    ['list', 'files', (args) => {
      if (args.doubleClick) {
        if (args.value instanceof Folder) {
          this.vdiskExplorer.cd(args.value.name);
        } else {
          this.attemptWrite();
        }
      } else {
        if (args.value instanceof File) {
          this.input.value = args.value.name;
          this.updateUi();
        }
      }
    }].act();
    ['dropdown', 'path', (args) => {
      this.vdiskExplorer.cd(args.value);
    }].act();    
    return true;
  }

  attemptWrite = () => {
    const files = this.vdiskExplorer.ls();
    let file = files.find(file => file.name === this.fileName);
    if (file) {
      const openFileWindow = globalThis.lib.openWindow('overwrite-file');
      openFileWindow.fileSave = file;
      MacApplication.activeApplication.appendWindow(openFileWindow);
      openFileWindow.addEventListener('select', (e) => {
        this.dispatchEvent(new CustomEvent('select', { detail: e.detail }));
        this.close();
      });
    } else {
      const fileSave = this.vdiskExplorer.getFile(this.fileName, true);
      this.dispatchEvent(new CustomEvent('select', { detail: fileSave }));
      this.close();
    }
  }

  get fileName() {
    const filename = this.input.value;
    if (filename.endsWith('.txt')) {
      return filename;
    } else {
      return filename + '.txt';
    }
  }
}

class OverwriteController extends MacExternalWindowController {
  onAction() {
    ['button', 'cancel', this.close].act();
    ['button', 'overwrite', () => {
      this.dispatchEvent(new CustomEvent('select', { detail: this.fileSave }));
      this.close();
    }].act();
    return true;
  }
}

customElements.define('lib-open-file-controller', OpenFileController);
customElements.define('lib-save-file-controller', SaveFileController);
customElements.define('lib-overwrite-controller', OverwriteController);

/**
 * Shows the file picker which allows the user to select a file or folder
 */
function showOpenFile() {
  const openFileWindow = globalThis.lib.openWindow('open-file');
  MacApplication.activeApplication.appendWindow(openFileWindow);
  return new Promise((resolve, reject) => {
    openFileWindow.addEventListener('select', (e) => {
      resolve(e.detail);
    });
    openFileWindow.addEventListener('cancel', () => {
      reject();
    });
  });
}

/**
 * Shows the file picker which allows the user to select a file or folder
 */
function showSaveFile() {
  const saveFileWindow = globalThis.lib.openWindow('save-file');
  MacApplication.activeApplication.appendWindow(saveFileWindow);
  return new Promise((resolve, reject) => {
    saveFileWindow.addEventListener('select', (e) => {
      resolve(e.detail);
    });
    saveFileWindow.addEventListener('cancel', () => {
      reject();
    });
  });
}

lib['file-picker'] = {
  showOpenFile,
  showSaveFile
}