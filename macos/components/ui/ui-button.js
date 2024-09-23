class UiButton extends HTMLElement {
  #action = null;
  #target = null;

  constructor() {
    super();    
  }

  connectedCallback() {
    this.#action = this.getAttribute('action');
    this.#target = this.getAttribute('target') || 'application';
    this.addEventListener('click', this.onClick);
  }

  onClick = (e) => {
    if (this.hasAttribute('disabled')) return;
    if (this.#action) {
      switch (this.#target) { 
        case 'application':
          MacApplication.emit('button', this.#action);
          break;
        case 'desktop':
          MacDesktop.onAction?.(this.#action);
          break;
        default:
          console.warn('Unknown target', this.#target);
      }
    } 
  }
}

customElements.define('ui-button', UiButton);