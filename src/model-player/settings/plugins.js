import * as THREE from "three";

function createBezierParticle(objectData, material, pluginData) {
  const { count = 100, isEquality = false, shape = "" } = pluginData;
  const sourceGeometry = shape !== "" ? this.getGeometry(shape) : new THREE.PlaneBufferGeometry(0.1, 1);
  const geometry = new THREE.InstancedBufferGeometry().copy(sourceGeometry);
  const positionFractions = new Float32Array(count);
  const particleIds = new Float32Array(count);

  void objectData.userData.pluginData;
  for (let index = 0; index < count; index += 1) {
    positionFractions[index] = isEquality ? index / count : Math.random();
    particleIds[index] = Math.random();
  }

  geometry.setAttribute("posFract", new THREE.InstancedBufferAttribute(positionFractions, 1, false));
  geometry.setAttribute("id", new THREE.InstancedBufferAttribute(particleIds, 1, false));
  if (material.defines.LOOP_COUNT > 0) {
    material.uniforms.startTime = { value: Math.random() };
  }
  return new THREE.Mesh(geometry, material);
}

const pluginSettings = {
  BEZIER_PARTICLE: createBezierParticle,
};

export default pluginSettings;
