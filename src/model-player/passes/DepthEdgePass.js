import * as THREE from "three";
import uniformSettings from "../settings/uniforms.js";
import { depthEdgeFragment, depthEdgeVertex } from "../shaders/index.js";

class DepthEdgePass {
  constructor(renderer, sourceTarget) {
    this.renderer = renderer;
    this.material = new THREE.ShaderMaterial({
      vertexShader: depthEdgeVertex,
      fragmentShader: depthEdgeFragment,
      uniforms: {
        diffuse: { value: sourceTarget.texture },
        resolution: uniformSettings.resolution,
      },
    });
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), this.material);
    this.scene.add(this.quad);
    this.scene.autoUpdate = false;
  }

  setResolution(width, height) {
    this.material.uniforms.resolution.value.set(width, height);
  }

  render(outputTarget) {
    this.renderer.setRenderTarget(outputTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.material.uniforms.diffuse.value = null;
    this.material.dispose();
    this.quad.geometry.dispose();
    this.scene.clear();
  }
}

export default DepthEdgePass;
