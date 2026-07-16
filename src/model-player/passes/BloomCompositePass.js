import * as THREE from "three";
import { blurFragment, blurVertex, compositeFragment, compositeVertex } from "../shaders/index.js";

class BloomCompositePass {
  constructor(renderer, sourceTarget) {
    this.source = sourceTarget.texture;
    this.outRes = new THREE.Vector2();
    this.blurMat = new THREE.ShaderMaterial({
      vertexShader: blurVertex,
      fragmentShader: blurFragment,
      uniforms: {
        diffuse: { value: null },
        resolution: { value: new THREE.Vector2() },
        blur: { value: 0 },
      },
    });
    this.hdrMat = new THREE.ShaderMaterial({
      vertexShader: compositeVertex,
      fragmentShader: compositeFragment,
      uniforms: {
        diffuse: { value: sourceTarget.texture },
        blurMap: { value: null },
        desatura: { value: 1 },
      },
    });
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), this.blurMat);
    this.scene.add(this.quad);
    this.scene.autoUpdate = false;
    this.bufferIndex = 0;
    const renderTargetOptions = {
      generateMipmaps: true,
      minFilter: THREE.LinearMipMapLinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    };
    this.renderBuffers = [new THREE.WebGLRenderTarget(2, 2, renderTargetOptions), new THREE.WebGLRenderTarget(2, 2, renderTargetOptions)];
    this.renderer = renderer;
    this.setResolution(sourceTarget.width, sourceTarget.height);
  }

  setDesaturate(value) {
    this.hdrMat.uniforms.desatura.value = value;
  }

  setResolution(width, height) {
    const powerWidth = 2 ** Math.floor(Math.log(width) / Math.LN2);
    const powerHeight = 2 ** Math.floor(Math.log(height) / Math.LN2);
    this.renderBuffers[0].setSize(powerWidth, powerHeight);
    this.renderBuffers[1].setSize(powerWidth, powerHeight);
    this.outRes.set(powerWidth, powerHeight);
  }

  render(outputTarget) {
    this.quad.material = this.blurMat;
    this.blurMat.uniforms.resolution.value.copy(this.outRes);
    this.blurMat.uniforms.diffuse.value = this.source;
    this.blurMat.uniforms.blur.value = 0.5;
    this.renderer.setRenderTarget(this.renderBuffers[this.bufferIndex]);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    this.blurMat.uniforms.resolution.value.copy(this.outRes);
    this.blurMat.uniforms.diffuse.value = this.renderBuffers[this.bufferIndex].texture;
    this.blurMat.uniforms.blur.value = 1;
    this.bufferIndex = 1 - this.bufferIndex;
    this.renderer.setRenderTarget(this.renderBuffers[this.bufferIndex]);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    this.blurMat.uniforms.diffuse.value = this.renderBuffers[this.bufferIndex].texture;
    this.blurMat.uniforms.blur.value = 1.5;
    this.bufferIndex = 1 - this.bufferIndex;
    this.renderer.setRenderTarget(this.renderBuffers[this.bufferIndex]);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    this.quad.material = this.hdrMat;
    this.hdrMat.uniforms.blurMap.value = this.renderBuffers[this.bufferIndex].texture;
    this.renderer.setRenderTarget(outputTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.blurMat.uniforms.diffuse.value = null;
    this.hdrMat.uniforms.diffuse.value = null;
    this.hdrMat.uniforms.blurMap.value = null;
    this.blurMat.dispose();
    this.hdrMat.dispose();
    this.quad.geometry.dispose();
    this.renderBuffers.forEach((buffer) => buffer.dispose());
    this.scene.clear();
  }
}

export default BloomCompositePass;
