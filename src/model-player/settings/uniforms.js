import * as THREE from "three";

export const uniformSettings = {
  weaponOpacity: { value: 1 },
  fps: { value: 1 },
  delta: { value: 0.016 },
  mouse: { value: new THREE.Vector2(0, 0) },
  mouseDelta: { value: new THREE.Vector2(0, 0) },
  lineOpacity: { value: 0 },
  time: { value: 0 },
  opacity: { value: 1 },
  resolution: { value: new THREE.Vector2(750, 1664) },
  offset: { value: new THREE.Vector3(0.44721, 0.46023, 0.76693) },
  brightness: { value: new THREE.Vector4(1, 1, 0.918, 0) },
  exposure: { value: 0 },
};

export default uniformSettings;
