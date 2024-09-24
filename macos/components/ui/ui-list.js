class UIListItem extends HTMLElement {
  #value;

  constructor() {
    super();
  }

  set value(v) { this.#value = v }
  get value() { return this.#value }

  connectedCallback() {
    this.addEventListener('click', this.onClick);
    this.addEventListener('dblclick', this.onDoubleClick);
    this.setAttribute('tabindex', '0');
    this.setAttribute('role', 'listitem');
  }

  onClick = () => {
    // Set siblings to not selected
    this.parentElement.querySelectorAll('ui-list-item').forEach((el) => {
      el.removeAttribute('selected');
    });
    // Set selected
    this.setAttribute('selected', '');
    this.focus();
    MacApplication.emit('list', 
      this.parentElement.getAttribute('target'), 
      { value: this.#value || this.innerText });
  }

  onDoubleClick = () => {
    MacApplication.emit('list', 
      this.parentElement.getAttribute('target'), 
      { 
        value: this.#value || this.innerText,
        doubleClick: true
      });
  }
}

class UIList extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.setAttribute('role', 'list');
  }

  setItems(data, decorator) {
    this.innerHTML = '';
    data.map(decorator).forEach((item) => {
      const el = document.createElement('ui-list-item');
      el.innerText = item.label;
      el.value = item.value;
      this.appendChild(el);
    });
  }

  blur() {
    this.querySelector('ui-list-item[selected]')?.removeAttribute('selected');
  }
}

customElements.define('ui-list-item', UIListItem);
customElements.define('ui-list', UIList);