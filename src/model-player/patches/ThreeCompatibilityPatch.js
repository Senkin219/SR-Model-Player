import * as THREE from "three";

const PATCH_MARKER = Symbol.for("model-player.three.instanced-buffer-geometry-copy");

export function patchThreeInstancedBufferGeometry() {
  const prototype = THREE.InstancedBufferGeometry.prototype;
  if (prototype[PATCH_MARKER]) return;

  const copy = prototype.copy;
  prototype.copy = function copyInstancedBufferGeometry(source) {
    copy.call(this, source);
    this.instanceCount = source.instanceCount || Infinity;
    return this;
  };

  Object.defineProperty(prototype, PATCH_MARKER, { value: true });
}

export default patchThreeInstancedBufferGeometry;
