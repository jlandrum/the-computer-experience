class UIListItem extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('click', this.onClick);
    this.setAttribute('tabindex', '0');
    this.setAttribute('role', 'listitem');
  }

  onClick = () => {
    this.focus();
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
      el.addEventListener('dblclick', () => {
        this.dispatchEvent(new CustomEvent('select', { detail: { ...item, doubleClick: true } }));
      });
      el.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('select', { detail: item }));
      });
      this.appendChild(el);
    });
  }
}

customElements.define('ui-list-item', UIListItem);
customElements.define('ui-list', UIList);