import * as THREE from "three";
import { resizeBuffer } from "./resizeBuffer.js";

class CopyPass {
  constructor() {
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D diffuse;
        void main() {
          gl_FragColor = texture2D(diffuse, vUv);
        }
      `,
      depthTest: false,
      depthWrite: false,
      transparent: false,
      uniforms: { diffuse: { value: null, type: "t" } },
    });
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), material);
    scene.add(quad);
    scene.autoUpdate = false;

    this.render = function render(renderer, input, output, shouldResize) {
      const previousTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(output);
      renderer.clear();
      if (shouldResize) resizeBuffer(input, output);
      material.uniforms.diffuse.value = input.texture;
      renderer.render(scene, camera);
      renderer.setRenderTarget(previousTarget);
    };
  }
}

export default CopyPass;
