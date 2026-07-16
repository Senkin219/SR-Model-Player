import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function createEventTargetAdapter(target, shouldForceRotate, adapters = new WeakMap()) {
  if (adapters.has(target)) return adapters.get(target);
  const listeners = new Map();
  let adapter;

  const transformEvent = (event) => {
    if (!shouldForceRotate() || event.pointerType !== "touch") return event;
    return new Proxy(event, {
      get(source, property) {
        if (property === "clientX" || property === "pageX") {
          return source[property === "clientX" ? "clientY" : "pageY"];
        }
        if (property === "clientY" || property === "pageY") {
          return source[property === "clientY" ? "clientX" : "pageX"];
        }
        const value = Reflect.get(source, property, source);
        return typeof value === "function" ? value.bind(source) : value;
      },
    });
  };

  adapter = new Proxy(target, {
    get(source, property) {
      if (property === "ownerDocument" && source.ownerDocument) {
        return createEventTargetAdapter(source.ownerDocument, shouldForceRotate, adapters);
      }
      if (property === "addEventListener") {
        return (type, listener, options) => {
          const key = `${type}:${options?.capture === true || options === true}`;
          let listenerMap = listeners.get(listener);
          if (!listenerMap) {
            listenerMap = new Map();
            listeners.set(listener, listenerMap);
          }
          const wrappedListener = (event) => listener.call(adapter, transformEvent(event));
          listenerMap.set(key, wrappedListener);
          source.addEventListener(type, wrappedListener, options);
        };
      }
      if (property === "removeEventListener") {
        return (type, listener, options) => {
          const key = `${type}:${options?.capture === true || options === true}`;
          const wrappedListener = listeners.get(listener)?.get(key) || listener;
          source.removeEventListener(type, wrappedListener, options);
        };
      }
      const value = Reflect.get(source, property, source);
      return typeof value === "function" ? value.bind(source) : value;
    },
  });
  adapters.set(target, adapter);
  return adapter;
}

export function createOrbitControls(object, domElement, target, forceRotate = false) {
  let forceRotateEnabled = forceRotate;
  const controlsDomElement = createEventTargetAdapter(domElement, () => forceRotateEnabled);
  const controls = new OrbitControls(object, controlsDomElement);
  const update = controls.update.bind(controls);
  const reset = controls.reset.bind(controls);

  controls.target.copy(target);
  controls.target0.copy(target);
  controls.isForceRotate = forceRotate;
  controls.minDistance = 240;
  controls.maxDistance = 400;
  controls.lastMoveDis = null;
  controls.minPolarAngle = 1.4;
  controls.maxPolarAngle = 1.4;
  controls.enablePan = false;
  controls.domElement.style.touchAction = "pan-y";

  controls.getDistance = () => controls.object.position.distanceTo(controls.target);
  controls.setForceRotate = (value) => {
    forceRotateEnabled = value;
    controls.isForceRotate = value;
  };
  controls.setTarget = (value) => {
    controls.target.copy(value);
    controls.target0.copy(value);
  };
  controls.update = () => {
    const changed = update();
    // const radius = controls.getDistance();
    // if (controls.enableZoom && controls.lastMoveDis) {
    //   const offset = -0.24 * (radius - controls.lastMoveDis);
    //   if (offset !== 0) {
    //     controls.target.y += offset;
    //     controls.object.position.y += offset;
    //     update();
    //   }
    // }
    // controls.lastMoveDis = radius;
    return changed;
  };
  controls.reset = () => {
    controls.lastMoveDis = null;
    reset();
  };
  controls.update();
  return controls;
}

export default createOrbitControls;
