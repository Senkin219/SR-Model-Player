import * as THREE from "three";
import uniformSettings from "../settings/uniforms.js";
import { fxaaFragment, fxaaVertex } from "../shaders/index.js";

class FxaaPass {
  constructor(renderer, sourceTarget) {
    this.renderer = renderer;
    this.material = new THREE.ShaderMaterial({
      vertexShader: fxaaVertex,
      fragmentShader: fxaaFragment,
      uniforms: {
        diffuse: { value: sourceTarget.texture },
        resolution: uniformSettings.resolution,
      },
      depthTest: false,
      depthWrite: false,
    });
    this.outRes = new THREE.Vector2();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), this.material);
    this.scene.add(this.quad);
    this.scene.autoUpdate = false;
    this.renderer = renderer;
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

export default FxaaPass;
