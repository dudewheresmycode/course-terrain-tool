import { EventEmitter } from 'events';

export default class BaseTask extends EventEmitter {
  constructor() {
    super();
    this.id = 'base';
    this.child = null;
    this.canceled = false;
    this.abortController = new AbortController();
    this.exitOnComplete = false;
  }

  /** You are expected to override this method when extending */
  process() {
    // noop
  }

  cancel() {
    this.abortController.abort();
  }
}
