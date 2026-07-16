import MhyBrowser from "../browser/index.js";

let instance = null;

export default class Browser {
  static getInstance() {
    if (!instance) instance = new MhyBrowser();
    return instance;
  }
}
