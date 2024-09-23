class MenuBar extends HTMLElement {
  static #primaryMenu;
  static #finderSegment;
  static #about;

  constructor() {
    super();    
    MenuBar.#finderSegment = document.querySelector('menu-segment#finder-segment');
    MenuBar.#about = document.querySelector('menu-dropdown-item#menu-about');
    MenuBar.#primaryMenu = this;
  }

  static replaceSegment(menu) {
    if (!menu) {
      MenuBar.#primaryMenu.querySelector('menu-segment').replaceWith(MenuBar.#finderSegment);
    } else {
      MenuBar.#primaryMenu.querySelector('menu-segment').replaceWith(menu);
    }
  }

  connectedCallback() {
    MenuBar.#about.addEventListener('activate', this.onAboutClick);
    setInterval(() => {
      if (MacApplication.activeApplication === 'Finder') {
        MenuBar.#about.setAttribute('label', 'About This Computer');
      } else {
        MenuBar.#about.setAttribute('label', 'About ' + MacApplication.activeApplication);
      }
    }, 1000);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  disconnectedCallback() {
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  // Watch attributes
  static get observedAttributes() {
    return ['icon'];
  }

  // Update icon attribute
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'icon') {
      if (newValue) {
        MenuBar.#about.style.setProperty('--icon', `url(/macos/${newValue})`);
        MenuBar.#about.setAttribute('icon', newValue);
      } else {
        MenuBar.#about.style.setProperty('--icon', undefined);
        MenuBar.removeAttribute('icon');
      }
    }
  }

  onMouseUp() {
    setTimeout(() => {
      MenuItem.active?.removeAttribute?.('open');
      MenuItem.active = undefined;
    }, MenuDropdownItem.hasItemHovered ? 300 : 0);
    MenuDropdownItem?.hoveredItem?.activate?.();
  }

  onAboutClick = () => {
    if (MacApplication.activeApplication === 'Finder') {
      MacApplication.spawn('about-mac');
    } else {
      MacApplication.emit('menu', 'about');
    }
  }
}

class MenuItem extends HTMLElement {
  static active = false;

  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('mousedown', this.onMouseDown);
    this.addEventListener('mouseover', this.onMouseOver);
  }

  disconnectedCallback() {
    this.removeEventListener('mousedown', this.onMouseDown);
    this.removeEventListener('mouseover', this.onMouseOver);
  }

  onMouseDown() {
    MenuItem.active = this;
    this.onMouseOver();
  }

  onMouseOver(e) {
    // Remove other menu items from active state
    document.querySelectorAll('menu-item').forEach(item => item.removeAttribute('open'));
    // Only trigger if active mode
    if (MenuItem.active) {
      this.setAttribute('open', '');
      MenuItem.active = this;
    }
  }
}

class MenuDropdownItem extends HTMLElement {
  static #itemHovered = null;

  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('mouseover', this.onMouseOver);
    this.addEventListener('mouseleave', this.onMouseOut);
  }

  disconnectedCallback() {
    this.removeEventListener('mouseover', this.onMouseOver);
    this.removeEventListener('mouseleave', this.onMouseOut);
  }

  onMouseOver = (e) => {
    setTimeout(() => {
      MenuDropdownItem.#itemHovered = e.target;
    }, 0);
  }

  onMouseOut() {
    MenuDropdownItem.#itemHovered = null;
  }

  activate() {
    MenuDropdownItem.#itemHovered = null;
    document.querySelector('mac-desktop').classList.add('busy');
    const interval = setInterval(() => {
      this.classList.toggle('blink');
    }, 32);
    setTimeout(() => {
      clearInterval(interval);
      this.classList.remove('blink');

      // If a target is supplies, open an app
      if (this.getAttribute('target')) {        
        // If the window is open, focus it.
        MacApplication.spawn(this.getAttribute('target'));
      } else if (this.getAttribute('action')) {
        MacApplication.emit('menu', this.getAttribute('action'));
      } else {
        this.dispatchEvent(new Event('activate'));
        document.querySelector('mac-desktop').classList.remove('busy');
      }
      document.querySelector('mac-desktop').classList.remove('busy');
    }, 300);
  }

  static get hasItemHovered() {
    return !!MenuDropdownItem.#itemHovered;
  }

  static get hoveredItem() {
    return MenuDropdownItem.#itemHovered;
  }


}

class MenuSegment extends HTMLElement {
  #owner;

  constructor() {
    super();
  }

  setOwner(owner) {
    this.#owner = owner;
  }

  set owner(owner) {
    this.#owner = owner;
  }

  get owner() {
    return this.#owner;
  }
}

class MenuClock extends HTMLElement {
  #minutes;
  #hours;
  #amPm;

  constructor() {
    super();
  }

  connectedCallback() {
    setInterval(this.updateClock, 1000);
    this.updateClock();
  }

  updateClock = () => {
    const now = new Date();
    if (this.#minutes === now.getMinutes() && this.#hours === now.getHours() % 12) return;

    this.#amPm = now.getHours() > 12 ? 'PM' : 'AM';
    this.#hours = now.getHours() % 12;
    this.#minutes = now.getMinutes();
    this.innerText = `${this.#hours}:${this.#minutes.toString().padStart(2, '0')} ${this.#amPm}`;
  }
}

class AppMenuItem extends MenuItem {
  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    
    this.watcher = setInterval(() => {
      if (MacApplication.activeApplication !== 'Finder') {
        this.setAttribute('title', MacApplication.activeApplication);
        this.setAttribute('icon', MacApplication.activeApplication.toLowerCase());
        this.style.setProperty('--icon', `url(/macos/${MacApplication.activeAppIcon})`);
      } else {
        this.setAttribute('title', 'Finder');
        this.removeAttribute('icon');
      }
    }, 1000);
  }

  disconnectedCallback() {
    clearInterval(this.watcher);
  }

}

globalThis.MenuBar = MenuBar;
globalThis.MenuItem = MenuItem;
globalThis.MenuDropdownItem = MenuDropdownItem;
globalThis.MenuSegment = MenuSegment;
globalThis.MenuClock = MenuClock;
globalThis.AppMenuItem = AppMenuItem;

customElements.define('menu-segment', MenuSegment);
customElements.define('menu-bar', MenuBar);
customElements.define('menu-item', MenuItem);
customElements.define('menu-dropdown-item', MenuDropdownItem);
customElements.define('menu-clock', MenuClock);
customElements.define('app-menu-item', AppMenuItem);