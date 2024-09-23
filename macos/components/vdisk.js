const disks = [];

class File {
  #name; #contents; #parent;

  constructor(name, contents) {
    this.#name = name;
    this.#contents = contents;
  }

  get name() { return this.#name; }
  get parent() { return this.#parent; }
  get path() {
    let path = this.name;
    let parent = this.#parent;
    while (parent) {
      path = parent.name + '/' + path;
      parent = parent.parent;
    }
    return '/Desktop/' + path;
  }
  
  set name(name) { this.#name = name; }
  
  read() { return this.#contents; }
  write(contents) { 
    this.#contents = contents; 
    disks.forEach(disk => disk.write());
  }
  
  setParent(parent) {
    this.#parent = parent;
  }

  toJSON() {
    return {
      type: 'file',
      name: this.#name,
      contents: this.#contents
    };
  }

  static fromJSON(json) {
    return new File(json.name, json.contents);
  }
}

class Folder {
  #name; #files = []; #parent;

  constructor(name, files) {
    this.#name = name;
    this.#files = files;
  }

  get name() { return this.#name; }
  get parent() { return this.#parent; }
  get files() { return this.#files; }

  get path() {
    let path = this.name;
    let parent = this.#parent;
    while (parent) {
      path = parent.name + '/' + path;
      parent = parent.parent;
    }
    return '/Desktop/' + path;
  }
  
  setParent(parent) {
    this.#parent = parent;
  }

  addFile(file) {
    this.#files.push(file);
    file.setParent(this);
  }

  toJSON() {
    return {
      type: 'folder',
      name: this.#name,
      files: this.#files
    };
  }

  static fromJSON(json) {
    const name = json.name;
    const folder = new Folder(name, []);
    json.files.map(file => {
      if (file.type === 'file') {
        const hydrateFile = File.fromJSON(file);
        return hydrateFile;
      } else {
        const folder = Folder.fromJSON(file);
        return folder;
      }
    }).forEach(file => {
      folder.addFile(file);
    });
    return folder;
  }
}

class Disk {
  write() {}
}

class VDisk extends Disk {
  static #eventBus = new EventTarget();
  fileTree;

  static emitChange = () => {
    VDisk.#eventBus.dispatchEvent(new Event('change'));
  }

  static addEventListener(event, callback) {
    VDisk.#eventBus.addEventListener(event, callback);
  }

  static removeEventListener(event, callback) {
    VDisk.#eventBus.removeEventListener(event, callback);
  }

  constructor() {
    super();
    this.fileTree = new Folder('MacintoshHD', []);

    if (localStorage.getItem('__hasDisk') !== 'true') {
      // If the disk hasn't been initialized, initialize it.
      this.fileTree.files.push(
        new File('welcome.txt', 'Welcome to macOS!'),
      );
      localStorage.setItem('__hasDisk', 'true');
      this.write();
      console.info('Initialized disk', this.name);
    } else {
      // Load the disk from local storage
      const contents = JSON.parse(localStorage.getItem(`__disk_${this.name}`));
      this.fileTree = Folder.fromJSON(contents);
      console.info('Loaded disk', this.name, this.fileTree);
    }
    disks.push(this);
  }

  readdir(path) {
    let folder = this.fileTree;
    if (path !== '') {
      path.split('/').forEach((folderName) => {
        folder = folder.files.find((it) => it.name === folderName);
        if (!folder) {
          throw new Error(`Folder ${path} does not exist`);
        }
      });
    }
    return folder.files;
  }

  write() {
    localStorage.setItem(`__disk_${this.name}`, JSON.stringify(this.fileTree));
    VDisk.emitChange();
  }
  
  get available() { 
    const bytes = 5_000_000 - localStorage.getItem(`__disk_${this.name}`).length; 
    if (bytes < 1_000_000) {
      return `${Math.floor(bytes / 1_000)} KB`;
    } else {
      return `${Math.floor(bytes / 1_000_000)} MB`;
    }
  }
  get root() { return this.fileTree }
  get name() { return this.fileTree.name }
}

class TrashDisk extends VDisk {
  constructor() {
    super();
    this.fileTree = new Folder('Trash', []);
  }

  get available() {
    return '0 MB';
  }
}

class VDiskExplorer {
  #cwd = '/Desktop';
  #localEventBus = new EventTarget();
  static #eventBus = new EventTarget();

  constructor() {}

  openFolder(folderName) {
    for (const folder of this.#cwd) {
      if (folder.name === folderName) {
        this.#cwd = folder;
        return;
      }
    }
  }

  get available() { 
    const [_, disk] = this.#cwd.split('/').slice(1);
    const vdisk = disks.find(d => d.name === disk);
    return vdisk?.available || '0 MB';
  }

  get cwd() { return this.#cwd; }

  ls() {
    const [_, disk, ...path] = this.#cwd.split('/').slice(1);
    if (!disk) { return disks.map(disk => disk.root) }
    const vdisk = disks.find(d => d.name === disk); 
    return vdisk.readdir(path.join('/'));
  }

  cd(folder) {
    // If starting with /, go to the root
    if (folder.startsWith('/')) {
      this.#cwd = '/';
    }
    // Normalize the path to handle ../ and ./
    this.#cwd = '/' + folder.split('/').reduce((acc, folder) => {
      if (folder === '..') {
        return acc.slice(0, -1);
      } else if (folder === '.') {
        return acc;
      } else {
        return acc.concat(folder);
      }
    }, this.#cwd.split('/')).filter(it => it).join('/');
    VDiskExplorer.emitChange();
    this.emitChange();
  }

  mkdir(folderName) {
    const [_, disk, ...path] = this.#cwd.split('/').slice(1);
    const vdisk = disks.find(d => d.name === disk);
    const folder =  vdisk.readdir(path.join('/'));
    folder.push(new Folder(folderName, []));
    vdisk.write();
    this.emitChange();
    VDiskExplorer.emitChange();
  }

  getFile = (fileNameOrPath, create = false) => {
    const fullPath = fileNameOrPath.indexOf('/') !== -1 ? fileNameOrPath : `${this.#cwd}/${fileNameOrPath}`; 
    const [_, disk, ...path] = fullPath.split('/').slice(1);
    const vdisk = disks.find(d => d.name === disk);
    if (!vdisk) {
      console.warn('No disk found', disk);
      return null;
    }
    const file = path.pop();
    const folder =  vdisk.readdir(path.join('/'));
    if (!folder) {
      console.warn('No folder found', path);
      return null;
    }
    const existingFile = folder.find(it => it.name === file);

    if (existingFile) {
      console.info('Loading existing file', existingFile);
      return existingFile;
    } else if (create) {
      const newFile = new File(file, '');
      folder.push(newFile);
      newFile.setParent(folder);
      console.info('Creating file', existingFile);
      return newFile;
    } else {
      console.warn('No file found', file);
      return null;
    }
  }

  get isWritable() {
    const [_, disk, ...path] = this.#cwd.split('/').slice(1);
    return !!disk;
  }


  static emitChange = () => {
    VDiskExplorer.#eventBus.dispatchEvent(new Event('change'));
  }

  static addEventListener(event, callback) {
    VDiskExplorer.#eventBus.addEventListener(event, callback);
  }

  static removeEventListener(event, callback) {
    VDiskExplorer.#eventBus.removeEventListener(event, callback);
  }

  emitChange() {
    this.#localEventBus.dispatchEvent(new Event('change'));
  }

  addEventListener(event, callback) {
    this.#localEventBus.addEventListener(event, callback);
  }

  removeEventListener(event, callback) {
    this.#localEventBus.removeEventListener(event, callback);
  }
}

globalThis.MacintoshHD = new VDisk('Macintosh HD');
globalThis.Trash = new TrashDisk('Trash');

globalThis.VDiskExplorer = VDiskExplorer;
globalThis.File = File;
globalThis.Folder = Folder;
globalThis.VDisk = VDisk;

export { VDisk, VDiskExplorer, File, Folder };