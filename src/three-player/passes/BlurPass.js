import * as THREE from "three";
import { resizeBuffer } from "./resizeBuffer.js";

const blurVertex = `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const blurFragment = `
uniform vec2 resolution;
uniform vec2 blur;
uniform float level;
uniform sampler2D diffuse;

void main() {
  float lod = level;
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 amount = level * blur;
  vec4 color = texture2D(diffuse, uv + amount * vec2( 1.0,  1.0) / resolution, lod);
  color += texture2D(diffuse, uv + amount * vec2( 1.0, -1.0) / resolution, lod);
  color += texture2D(diffuse, uv + amount * vec2(-1.0,  1.0) / resolution, lod);
  color += texture2D(diffuse, uv + amount * vec2(-1.0, -1.0) / resolution, lod);
  gl_FragColor = color / 4.0;
}
`;

class BlurPass {
  constructor() {
    const material = new THREE.ShaderMaterial({
      vertexShader: blurVertex,
      fragmentShader: blurFragment,
      depthTest: false,
      depthWrite: false,
      transparent: false,
      uniforms: {
        diffuse: { value: null, type: "t" },
        resolution: { value: new THREE.Vector2(), type: "v2" },
        blur: { value: new THREE.Vector2() },
        level: { value: 0, type: "f" },
      },
    });
    const defaultCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const scene = new THREE.Scene();
    const quadGeometry = new THREE.PlaneBufferGeometry(2, 2);
    const quad = new THREE.Mesh(quadGeometry, material);
    scene.add(quad);
    const resolution = new THREE.Vector2();
    let bufferIndex = 0;
    let width = 2;
    let height = 2;
    const renderTargetOptions = {
      generateMipmaps: true,
      minFilter: THREE.LinearMipMapLinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    };
    const renderTargets = [new THREE.WebGLRenderTarget(2, 2, renderTargetOptions), new THREE.WebGLRenderTarget(2, 2, renderTargetOptions)];

    this.render = function render(renderer, input, output, shouldResize, blurX, blurY, targetGeometry, camera = defaultCamera) {
      if (shouldResize) resizeBuffer(input, output);
      const sizeSource = output || input;
      const outputWidth = sizeSource.width;
      const outputHeight = sizeSource.height;
      if (width !== outputWidth || height !== outputHeight) {
        const powerWidth = 2 ** Math.floor(Math.log(outputWidth) / Math.LN2);
        const powerHeight = 2 ** Math.floor(Math.log(outputHeight) / Math.LN2);
        renderTargets[0].setSize(powerWidth, powerHeight);
        renderTargets[1].setSize(powerWidth, powerHeight);
        resolution.set(powerWidth, powerHeight);
        width = outputWidth;
        height = outputHeight;
      }

      if (targetGeometry) {
        quad.geometry = targetGeometry.geometry;
        if (!quad.matrix.equals(targetGeometry.matrixWorld)) {
          targetGeometry.matrixWorld.decompose(quad.position, quad.quaternion, quad.scale);
        }
      } else if (quad.geometry !== quadGeometry) {
        quad.geometry = quadGeometry;
        quad.position.set(0, 0, 0);
        quad.rotation.set(0, 0, 0);
        quad.scale.set(1, 1, 1);
      }
      scene.autoUpdate = true;

      const previousTarget = renderer.getRenderTarget();
      material.uniforms.blur.value.set(blurX, blurY);
      material.uniforms.resolution.value.copy(resolution);
      material.uniforms.diffuse.value = input.texture;
      material.uniforms.level.value = 0.5;
      renderer.setRenderTarget(renderTargets[bufferIndex]);
      renderer.clear();
      renderer.render(scene, camera);
      scene.autoUpdate = false;

      material.uniforms.resolution.value.copy(resolution);
      material.uniforms.diffuse.value = renderTargets[bufferIndex].texture;
      material.uniforms.level.value = 1;
      bufferIndex = 1 - bufferIndex;
      renderer.setRenderTarget(renderTargets[bufferIndex]);
      renderer.clear();
      renderer.render(scene, camera);

      material.uniforms.resolution.value.copy(resolution);
      material.uniforms.diffuse.value = renderTargets[bufferIndex].texture;
      bufferIndex = 1 - bufferIndex;
      renderer.setRenderTarget(renderTargets[bufferIndex]);
      renderer.clear();
      renderer.render(scene, camera);

      material.uniforms.diffuse.value = renderTargets[bufferIndex].texture;
      bufferIndex = 1 - bufferIndex;
      renderer.setRenderTarget(renderTargets[bufferIndex]);
      renderer.clear();
      renderer.render(scene, camera);

      material.uniforms.level.value = 1.5;
      material.uniforms.diffuse.value = renderTargets[bufferIndex].texture;
      material.uniforms.resolution.value.set(outputWidth, outputHeight);
      renderer.setRenderTarget(output);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(previousTarget);
    };
  }
}

export default BlurPass;
