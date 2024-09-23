/** 
 * @class Process
 * Represents a "process" 
 * Processes are a virtual concept that do not represent actual "running"
 * processes, but offers a mechanism for applications to be terminated */
class Process {
  #application;
  #name;
  #invokeName;

  get name() { return this.#name }
  get invokeName() { return this.#invokeName }
  get application() { return this.#application }

  constructor(application, invokeName) {
    this.#application = application;
    this.#name = application.name;
    this.#invokeName = invokeName;
  }

  /** Kills the process */
  kill() {
    this.#application.exit();
  }
}

globalThis.Process = Process;