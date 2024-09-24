class UIIcon extends HTMLElement {
  #open = false;
  #icon;

  constructor() {
    super();
  }

  connectedCallback() {
    this.tabIndex = 0;
    this.addEventListener('click', this.onClick);
    this.addEventListener('dblclick', this.onDblClick);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('dblclick', this.onDblClick);
  }

  onClick = (e) => {
    this.parentElement.querySelectorAll('ui-icon[active]').forEach(icon => {
      icon.blur();
      icon.updateIcon();
    });
    this.setAttribute('active', '');
    this.updateIcon();
  }

  onDblClick = () => {
    MacApplication.emit('icon', 'dblclick', { icon: this });
  }

  blur = () => {
    this.removeAttribute('active');
    this.updateIcon();
  }

  static get observedAttributes() {
    return ['icon', 'x', 'y', 'state', 'open'];
  }

  get #state() {
    if (this.#open) return 'open';
    if (this.hasAttribute('active')) return 'focused';
    return 'normal';
  } 

  updateIcon = () => {
    this.style.backgroundImage = `url(./${this.#icon}@${this.#state}.svg)`;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'open':
        this.#open = !!newValue;
        break;
      case 'icon':
        this.#icon = newValue;
        break;
      case 'x':
        this.style.left = `${newValue}px`;
        break;
      case 'y':
        this.style.top = `${newValue}px`;
        break;
    }
    this.updateIcon();
  }
}

class UIIcons extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('click', this.onClick);
  }

  onClick = (e) => {
    if (!(e.target instanceof UIIcon)) {
      this.querySelectorAll('ui-icon').forEach(icon => {
        icon.blur();
      });
    }
  }

  updateState() {
    this.icons.forEach(icon => {
      const target = icon.getAttribute('target');
      const exists = FinderApp.getFileState(target);
      if (exists) {
        icon.setAttribute('open', true);
      } else {
        icon.removeAttribute('open');
      }
    });
  }

  get icons() {
    return this.querySelectorAll('ui-icon');
  }
}

globalThis.UIIcon = UIIcon;
globalThis.UIIcons = UIIcons;

customElements.define('ui-icon', UIIcon);
customElements.define('ui-icons', UIIcons);