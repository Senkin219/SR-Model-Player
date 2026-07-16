import MouseUtil from "./MouseUtil.js";

export class MouseProcess {
  constructor(domElement, source, camera) {
    this.domElement = domElement;
    this.uuid = MouseUtil.hashUUID(source, camera);
    this.clicks = MouseUtil.getClick(source);
    this.camera = camera;
    this.isMouseEnabled = true;
  }

  get next() {
    return this._next;
  }
  get valid() {
    return Boolean(this.mouseEnabled && this.clicks && this.clicks.length && this.camera);
  }
  set mouseEnabled(value) {
    this.isMouseEnabled = value;
    if (!value && this.domElement && this.domElement.style.cursor === "pointer") {
      this.domElement.style.cursor = "default";
    }
  }
  get mouseEnabled() {
    return this.isMouseEnabled;
  }

  dispose() {
    this.mouseEnabled = false;
    this.domElement = null;
    this.clicks = null;
    this.camera = null;
  }

  checkSceneClick(point, eventName, event) {
    if (this.mouseEnabled) {
      MouseUtil.sceneHitTest(point, this.clicks, this.camera, eventName, this.domElement, event);
    }
  }

  proxy(source, camera) {
    const process = new MouseProcess(this.domElement, source, camera);
    this._next = process;
    this._createProxyCallback(this.domElement, this.clicks[0], process);
    return process;
  }

  _createProxyCallback(domElement, proxyObject, process) {
    const { clicks, camera } = process;
    proxyObject.userData.onClick = (event, intersection) => {
      MouseUtil.proxyHitTest(intersection, clicks, camera, "onClick", domElement, event);
    };
    proxyObject.userData.onMouseDown = (event, intersection) => {
      MouseUtil.proxyHitTest(intersection, clicks, camera, "onMouseDown", domElement, event);
    };
    proxyObject.userData.onMouseUp = (event, intersection) => {
      MouseUtil.proxyHitTest(intersection, clicks, camera, "onMouseUp", domElement, event);
    };
    proxyObject.userData.onMouseMove = (event, intersection) => {
      MouseUtil.proxyHitTest(intersection, clicks, camera, "onMouseMove", domElement, event);
    };
    proxyObject.userData.onMouseWheel = (event, intersection) => {
      MouseUtil.proxyHitTest(intersection, clicks, camera, "onMouseWheel", domElement, event);
    };
    proxyObject.userData.mouseEnabled = true;
  }
}

export default MouseProcess;
