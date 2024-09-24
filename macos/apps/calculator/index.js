class CalculatorApp extends MacApplication {
  #value = '';
  #operand = '';
  #collector = '';
  #displayInput = false;

  get name () { return 'Calculator' }
  get icon() { return 'apps/finder/icon.png' }

  newWindow = () => {
    return this.spawnWindowFromTemplate('calculator');
  }

  get value() { 
    return this.#value || '0';
  }

  get displayValue() {
    const displayVal = ((this.#displayInput ? this.#value || this.#collector : this.#collector || this.#value) || '0');
    return displayVal.length > 15 ? displayVal.slice(0, 15) : displayVal;
  }

  set value(v) {
    this.#value = v;
    this.querySelector('.input').textContent = this.displayValue;
  }

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();

    this.querySelector('calc-grid').addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        this.handleButton(e.target.textContent);
      }
    });

    document.addEventListener('keydown', this.handleKeyPress);
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.handleKeyPress);
  }

  handleKeyPress = (e) => {
    if (!this.isFocused) { return }
    this.handleButton(e.key);
    // Go through all buttons and set the active class if inner text matches the key
    this.querySelectorAll('button').forEach((button) => {
      if (button.textContent === e.key) {
        button.classList.add('active');
        setTimeout(() => button.classList.remove('active'), 100);
      }
    });
  }

  handleButton(action) {
    switch (action) {
      case 'c':
      case 'C':
        this.#value = '';
        this.#collector = '';
        this.#operand = '';
        break;
      case '+':
      case '-':
      case '*':
      case '/':
        this.#collector = this.#collector || this.#value;
        this.#value = '';
        this.#operand = action;
        break;
      case 'Enter':
      case '=':
        this.#displayInput = false;
        this.calculate();
        break;
      default:
        if (/[0-9\.]/.test(action)) {
          if (action === '.' && this.#value.includes('.')) { return }
          this.#displayInput = true;
          this.value = `${this.value}${action}`;
        }
        break;
    }
    this.sanitizeValue();
  }

  calculate() {
    if (this.#value === '') {
      this.#value = this.#collector;
    }
    switch (this.#operand) {
      case '+':
        this.#collector = parseFloat(this.#collector) + parseFloat(this.#value || this.#collector);
        break;
      case '-':
        this.#collector = parseFloat(this.#collector) - parseFloat(this.#value || this.#collector);
        break;
      case '*':
        this.#collector = parseFloat(this.#collector) * parseFloat(this.#value || this.#collector);
        break;
      case '/':
        this.#collector = parseFloat(this.#collector) / parseFloat(this.#value || this.#collector);
        break;
      default:
        break;
    }
  }

  sanitizeValue() {
    // Remove leading zeros
    this.value = this.value.toString().replace(/^0+/, '');      
  }
}

customElements.define('app-calculator', CalculatorApp);