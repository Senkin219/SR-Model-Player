import * as THREE from "three";

const raycaster = new THREE.Raycaster();

export class MouseUtil {
  static sceneHitTest(point, clicks, camera, eventName, domElement, event) {
    if (!clicks) return;
    const intersections = [];
    raycaster.setFromCamera(point, camera);
    const rollOutObjects = clicks.filter(
      (object) => object.userData.isMouseOver && object.userData.mouseEnabled && object.userData.onRollOut && eventName === "onMouseMove",
    );
    for (let index = clicks.length - 1; index > -1; index -= 1) {
      const object = clicks[index];
      if (object.userData.mouseEnabled && object.userData[eventName]) {
        if (!object.visible) object.updateMatrixWorld();
        intersections.length = 0;
        object.raycast(raycaster, intersections);
        if (intersections.length > 0) {
          if (eventName === "onMouseMove") {
            rollOutObjects.forEach((rollOutObject) => {
              if (rollOutObject !== object && rollOutObject.userData.isMouseOver) {
                rollOutObject.userData.onRollOut();
                if (rollOutObject.userData.buttonMode) domElement.style.cursor = "default";
                rollOutObject.userData.isMouseOver = false;
              }
            });
            rollOutObjects.length = 0;
            if (object.userData.onRollOver && !object.userData.isMouseOver) {
              object.userData.onRollOver();
              if (object.userData.buttonMode) domElement.style.cursor = "pointer";
              object.userData.isMouseOver = true;
            }
          }
          if (!object.userData[eventName](event, intersections[0])) return;
        }
      }
    }
    if (rollOutObjects.length > 0) {
      rollOutObjects.forEach((object) => {
        if (object.userData.mouseEnabled && object.userData.isMouseOver) {
          if (object.userData.onRollOut) object.userData.onRollOut();
          domElement.style.cursor = "default";
          object.userData.isMouseOver = false;
        }
      });
    }
  }

  static proxyHitTest(intersection, clicks, camera, eventName, domElement, event) {
    const point = new THREE.Vector2(2 * (intersection.uv.x - 0.5), 2 * (intersection.uv.y - 0.5));
    MouseUtil.sceneHitTest(point, clicks, camera, eventName, domElement, event);
  }

  static hashUUID(object, camera) {
    return (object.uuid || "") + (camera.uuid || "");
  }

  static getClick(source) {
    if (!source) return [];
    if (source.clicks) return source.clicks;
    return Array.isArray(source) ? source : [source];
  }

  static getMouseXYByRect(event, isTouch) {
    const rect = event.target.getBoundingClientRect();
    return {
      offsetX: (isTouch ? event.touches[0].clientX : event.clientX) - rect.left,
      offsetY: (isTouch ? event.touches[0].clientY : event.clientY) - rect.top,
      width: rect.width,
      height: rect.height,
    };
  }
}

export default MouseUtil;
