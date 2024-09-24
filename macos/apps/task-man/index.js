if (typeof TaskMan === 'undefined') {
  class TaskMan extends MacApplication {
    #timer;

    constructor() {
      super();
    }

    connectedCallback() {
      super.connectedCallback();
      this.#timer = setInterval(() => {
        this.querySelector('pre').textContent = 
          ['== Active ==',
          `${MacApplication.activeApplication}`,
          `\n== Processes ==`,
          `${MacApplication.processes.map(p => p.name).join('\n')}`.trim()].join('\n');
      }, 1000);
    }

    disconnectedCallback() {
      clearInterval(this.#timer);
    }
    
    showAbout() {
      this.showDialog('TaskMan Task Manager');
    }

    get name() { return 'TaskMan' }
    get icon() { return 'apps/task-man/icon.svg' }

    newWindow = () => {}

    onAction = (source, action, detail) => {
      if (source === 'menu') {
        switch (action) {
          case 'close':
            this.exit();
            break;
          case 'about':
            this.showAbout();
            break;
        }
      }
    }
  }

  customElements.define('app-task-man', TaskMan);
}