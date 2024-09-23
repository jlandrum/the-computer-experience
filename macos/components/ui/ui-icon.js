class UiIcon extends HTMLElement {
  #focused = false; 
  #open = false;
  #icon;

  constructor() {
    super();
  }

  connectedCallback() {
    this.tabIndex = 0;
    this.addEventListener('click', this.onClick);
    this.addEventListener('dblclick', this.onDblClick);
    this.addEventListener('blur', this.onBlur);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('dblclick', this.onDblClick);
    this.removeEventListener('blur', this.onBlur);
  }

  onClick = (e) => {
    this.parentElement.querySelectorAll('ui-icon').forEach(icon => {
      icon.blur() ;
      icon.updateIcon();
    });
    this.#focused = true;
    this.updateIcon();
  }

  onDblClick = () => {
    MacApplication.emit('icon', 'dblclick', { icon: this });
  }

  onBlur = () => {
    this.#focused = false;
    this.updateIcon();
  }

  blur = () => {
    this.#focused = false;
    this.updateIcon();
  }

  static get observedAttributes() {
    return ['icon', 'x', 'y', 'state', 'open'];
  }

  get #state() {
    if (this.#open) return 'open';
    if (this.#focused) return 'focused';
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

class UiIcons extends HTMLElement {
  constructor() {
    super();
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

globalThis.UiIcon = UiIcon;
globalThis.UiIcons = UiIcons;

customElements.define('ui-icon', UiIcon);
customElements.define('ui-icons', UiIcons);