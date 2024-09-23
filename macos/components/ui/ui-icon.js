class UiIcon extends HTMLElement {
  #focused; 
  #open;
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

  onClick = () => {
    () => this.dispatchEvent(new CustomEvent('click'));
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

  static get observedAttributes() {
    return ['icon', 'x', 'y', 'state'];
  }

  get #state() {
    if (this.#focused) return 'focused';
    if (this.#open) return 'open';
    return 'normal';
  } 

  updateIcon = () => {
    this.style.backgroundImage = `url(./${this.#icon}@${this.#state}.svg)`;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'state':
        this.#state = newValue || 'normal';
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

customElements.define('ui-icon', UiIcon);