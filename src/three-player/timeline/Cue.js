export class Cue {
  constructor(source) {
    const { frame = 0, method = "", root = {}, methods = {} } = source || {};
    this.frame = frame;
    this.method = method;
    this.fired = false;
    this.prevTime = frame + 1;
    const [methodName, parameter] = method.split("?");
    const cueFunction = methods[methodName] || root[methodName];
    if (cueFunction) {
      this.cueFunc = cueFunction.bind(root);
      this.cueParam = parameter;
    }
  }

  update(_previousTime, time) {
    if (!this.fired && this.prevTime <= this.frame && time >= this.frame) {
      this.fired = true;
      if (this.cueFunc) this.cueFunc(this.cueParam);
    }
    this.prevTime = time;
  }

  reset() {
    this.prevTime = this.frame + 1;
    this.fired = false;
  }

  toJSON() {
    return { frame: this.frame, method: this.method };
  }
}

export default Cue;
