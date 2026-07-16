import * as THREE from "three";
import MouseProcess from "./MouseProcess.js";
import MouseUtil from "./MouseUtil.js";
import Device from "../device.js";
import eventDispatcher from "../events.js";

export class MouseController {
  constructor(player, options) {
    const { domElement, uniformSetting } = player;
    const { type, mouseEnableMoveCheck = false, clickOnly = false } = options || {};
    this.uniformSetting = uniformSetting;
    if (!this.uniformSetting.mouse?.value?.isVector4) {
      this.uniformSetting.mouse = { value: new THREE.Vector4(0, 0, 1, 1) };
    }
    this.processes = [];
    this.mouseMoved = false;
    this.mouseEnabled = true;
    this.mouseDown = false;
    this.mouseNeedsRefresh = false;
    this.mouseEnableMoveCheck = mouseEnableMoveCheck;
    this.mouseCurrent = new THREE.Vector4();
    this.onDomMouseMoveScoped = this.onDomMouseMove.bind(this);
    this.onDomMouseDownScoped = this.onDomMouseDown.bind(this);
    this.onDomMouseUpScoped = this.onDomMouseUp.bind(this);
    this.onDomTouchStartScoped = this.onDomTouchStart.bind(this);
    this.onDomTouchMoveScoped = this.onDomTouchMove.bind(this);
    this.onDomTouchEndScoped = this.onDomTouchEnd.bind(this);
    this.onDomMouseWheelScoped = this.onDomMouseWheel.bind(this);
    this.onDomClickScoped = this.onDomClick.bind(this);

    if (clickOnly) {
      domElement.addEventListener("click", this.onDomClickScoped);
    } else if (type === "pc" || (!type && Device.getInstance().desktop())) {
      domElement.addEventListener("mousemove", this.onDomMouseMoveScoped);
      domElement.addEventListener("mousedown", this.onDomMouseDownScoped);
      domElement.addEventListener("mouseup", this.onDomMouseUpScoped);
      domElement.addEventListener("mouseout", this.onDomMouseUpScoped);
    } else {
      domElement.addEventListener("touchstart", this.onDomTouchStartScoped, { passive: false });
      domElement.addEventListener("touchmove", this.onDomTouchMoveScoped, { passive: false });
      domElement.addEventListener("touchend", this.onDomTouchEndScoped);
    }
    domElement.addEventListener("mousewheel", this.onDomMouseWheelScoped);
    this.domElement = domElement;
  }

  disableMouse() {
    this.mouseDisabled = true;
    this.mouseEnabled = false;
  }
  enableMouse() {
    this.mouseDisabled = false;
    this.mouseEnabled = true;
  }
  lockMouse() {
    this.mouseEnabled = false;
  }
  freeMouse() {
    if (!this.mouseDisabled) this.mouseEnabled = true;
  }

  dispose() {
    this.domElement.removeEventListener("touchstart", this.onDomTouchStartScoped);
    this.domElement.removeEventListener("touchmove", this.onDomTouchMoveScoped);
    this.domElement.removeEventListener("touchend", this.onDomTouchEndScoped);
    this.domElement.removeEventListener("mousedown", this.onDomMouseDownScoped);
    this.domElement.removeEventListener("mousemove", this.onDomMouseMoveScoped);
    this.domElement.removeEventListener("mouseup", this.onDomMouseUpScoped);
    this.domElement.removeEventListener("mouseout", this.onDomMouseUpScoped);
    this.domElement.removeEventListener("mousewheel", this.onDomMouseWheelScoped);
    this.domElement.removeEventListener("click", this.onDomClickScoped);
    this.mouseCheckScene = null;
    this.mouseCheckCamera = null;
    while (this.processes.length) this.processes.pop().dispose();
  }

  add(source, camera) {
    let process = this.find(source, camera);
    if (!process) {
      process = new MouseProcess(this.domElement, source, camera);
      this.processes.push(process);
    }
    return process;
  }

  remove(source, camera) {
    const uuid = MouseUtil.hashUUID(source, camera);
    this.processes = this.processes.filter((process) => process.uuid !== uuid);
    return this;
  }

  find(source, camera) {
    const uuid = MouseUtil.hashUUID(source, camera);
    return this.processes.find((process) => process.uuid === uuid);
  }

  updateMouseUniform(event, isTouch) {
    const { offsetX, offsetY, width, height } = MouseUtil.getMouseXYByRect(event, isTouch);
    if (this.uniformSetting.rotate) this.mouseCurrent.set(offsetY, offsetX, height, width);
    else this.mouseCurrent.set(offsetX, offsetY, width, height);
  }

  onDomMouseWheel(event) {
    this.updateMouseUniform(event);
    this.uniformSetting.mouse.value.copy(this.mouseCurrent);
    this.uniformSetting.mouseDelta.value.z = 0.05 * event.deltaY;
    if (this.mouseEnabled) {
      const point = this.calcRayPoint();
      this.processes.forEach((process) => process.checkSceneClick(point, "onMouseWheel", event));
      eventDispatcher.dispatchEvent({ type: "MOUSE_WHEEL" });
    }
  }

  onDomMouseMove(event) {
    if (this.mouseDown || this.mouseEnableMoveCheck) {
      this.updateMouseUniform(event);
      this.uniformSetting.mouseDelta.value.set(
        0.5 * (this.mouseCurrent.x - this.uniformSetting.mouse.value.x),
        0.5 * (this.mouseCurrent.y - this.uniformSetting.mouse.value.y),
        0,
      );
      this.uniformSetting.mouse.value.copy(this.mouseCurrent);
      if (Math.abs(this.uniformSetting.mouseDelta.value.x) + Math.abs(this.uniformSetting.mouseDelta.value.y) > 4) this.mouseMoved = true;
      if (this.mouseEnabled) {
        const point = this.calcRayPoint();
        this.processes.forEach((process) => process.checkSceneClick(point, "onMouseMove", event));
        eventDispatcher.dispatchEvent({ type: "MOUSE_MOVE" });
      }
    }
  }

  onDomMouseDown(event) {
    if (this.mouseEnabled) {
      this.updateMouseUniform(event);
      this.uniformSetting.mouse.value.copy(this.mouseCurrent);
      this.uniformSetting.mouseDelta.value.set(0, 0, 0);
      this.mouseMoved = false;
      this.mouseNeedsRefresh = false;
      this.mouseDown = true;
      const point = this.calcRayPoint();
      this.processes.forEach((process) => process.checkSceneClick(point, "onMouseDown", event));
      eventDispatcher.dispatchEvent({ type: "MOUSE_DOWN" });
    }
  }

  onDomMouseUp(event) {
    this.uniformSetting.mouseDelta.value.set(0, 0, 0);
    this.mouseDown = false;
    if (this.mouseEnabled && !this.mouseNeedsRefresh) {
      const point = this.calcRayPoint();
      this.processes.forEach((process) => {
        process.checkSceneClick(point, "onMouseUp", event);
        if (!this.mouseMoved) {
          process.checkSceneClick(point, "onClick", event);
          eventDispatcher.dispatchEvent({ type: "MOUSE_CLICK" });
        }
      });
      eventDispatcher.dispatchEvent({ type: "MOUSE_UP" });
      this.mouseNeedsRefresh = true;
    }
  }

  onDomClick(event) {
    if (this.mouseEnabled) {
      this.updateMouseUniform(event);
      this.uniformSetting.mouse.value.copy(this.mouseCurrent);
      this.uniformSetting.mouseDelta.value.set(0, 0, 0);
      this.mouseMoved = false;
      this.mouseNeedsRefresh = false;
      this.mouseDown = false;
      const point = this.calcRayPoint();
      this.processes.forEach((process) => process.checkSceneClick(point, "onClick", event));
      eventDispatcher.dispatchEvent({ type: "MOUSE_CLICK" });
    }
  }

  onDomTouchEnd(event) {
    this.uniformSetting.mouseDelta.value.set(0, 0, 0);
    if (this.mouseEnabled && !this.mouseNeedsRefresh) {
      const point = this.calcRayPoint();
      this.processes.forEach((process) => {
        process.checkSceneClick(point, "onMouseUp", event);
        if (!this.mouseMoved) {
          process.checkSceneClick(point, "onClick", event);
          eventDispatcher.dispatchEvent({ type: "MOUSE_CLICK" });
        }
      });
      eventDispatcher.dispatchEvent({ type: "MOUSE_UP" });
      this.mouseNeedsRefresh = true;
    }
  }

  onDomTouchMove(event) {
    event.preventDefault();
    this.updateMouseUniform(event, true);
    this.uniformSetting.mouseDelta.value.set(
      this.mouseCurrent.x - this.uniformSetting.mouse.value.x,
      this.mouseCurrent.y - this.uniformSetting.mouse.value.y,
      0,
    );
    this.uniformSetting.mouse.value.copy(this.mouseCurrent);
    if (this.mouseEnabled) {
      if (Math.abs(this.uniformSetting.mouseDelta.value.x) + Math.abs(this.uniformSetting.mouseDelta.value.y) > 10) this.mouseMoved = true;
      const point = this.calcRayPoint();
      this.processes.forEach((process) => process.checkSceneClick(point, "onMouseMove", event));
      eventDispatcher.dispatchEvent({ type: "MOUSE_MOVE" });
    }
  }

  onDomTouchStart(event) {
    event.preventDefault();
    if (this.mouseEnabled) {
      this.updateMouseUniform(event, true);
      this.uniformSetting.mouse.value.copy(this.mouseCurrent);
      this.mouseMoved = false;
      this.mouseNeedsRefresh = false;
      const point = this.calcRayPoint();
      this.processes.forEach((process) => process.checkSceneClick(point, "onMouseDown", event));
      eventDispatcher.dispatchEvent({ type: "MOUSE_DOWN" });
    }
  }

  calcRayPoint() {
    const { x, y, z: width, w: height } = this.uniformSetting.mouse.value;
    if (this.uniformSetting.rotate) {
      return new THREE.Vector2((x / width) * 2 - 1, (y / height) * 2 - 1);
    }
    return new THREE.Vector2((x / width) * 2 - 1, -(y / height) * 2 + 1);
  }

  get isMouseFree() {
    return this.mouseEnabled;
  }
}

export default MouseController;
