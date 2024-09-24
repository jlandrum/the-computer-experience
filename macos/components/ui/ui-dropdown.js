class UIDropdown extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('click', this.onClick);
    document.addEventListener('click', this.onDocumentClick);
  }

  
  onClick = (e) => {
    if (!e.target === this) return;
    this.toggle(!this.hasAttribute('open'));
  }

  onDocumentClick = (e) => {
    if (!this.contains(e.target)) {
      this.toggle(false);
    }
  }

  toggle(show) {
    if (show) {
      this.setAttribute('open', '');
    } else {
      this.removeAttribute('open');
    }
  }

  setItems(data, decorator) {
    const list = this.querySelector('ui-dropdown-list');
    list.setItems(data, decorator);
  }
}

class UIDropdownList extends HTMLElement {
  #data;
  #dropdown;

  constructor() {
    super();
  }

  connectedCallback() {
    this.#dropdown = this.parentElement;
    if (!this.#dropdown || !(this.#dropdown instanceof UIDropdown)) {
      throw new Error('UIDropdownList must be a child of UIDropdown');
    }
  }

  set selection(i) {
    this.#dropdown.setAttribute('value', this.#data[i].label);
  }

  setItems(data, decorator) {
    this.innerHTML = '';
    this.#data = data.map(decorator);
    this.#data.forEach((item) => {
      const el = document.createElement('ui-dropdown-list-item');
      el.innerText = item.label;
      el.value = item.value;
      this.appendChild(el);
    }); 
    this.selection = 0;
  }
}

class UIDropdownListItem extends HTMLElement {
  #value;

  constructor() {
    super();
  }

  get value() { return this.#value }
  set value(v) { this.#value = v }

  connectedCallback() {
    this.addEventListener('click', this.onClick);
    this.setAttribute('tabindex', '0');
    this.setAttribute('role', 'listitem');
  }

  onClick = () => {
    this.focus();
    MacApplication.emit('dropdown', 
      this.closest('ui-dropdown').getAttribute('target'), 
      { value: this.#value });
  }
}

globalThis.UIDropdown = UIDropdown;
globalThis.UIDropdownList = UIDropdownList;
globalThis.UIDropdownListItem = UIDropdownListItem;

customElements.define('ui-dropdown', UIDropdown);
customElements.define('ui-dropdown-list', UIDropdownList);
customElements.define('ui-dropdown-list-item', UIDropdownListItem);