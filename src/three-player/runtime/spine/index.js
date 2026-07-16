import * as THREE from "three";
import * as SpineCore from "@esotericsoftware/spine-core";
import * as SpineThreeJs from "@esotericsoftware/spine-threejs";
import { AutoBone, BoneSpeedConfig } from "./AutoBone.js";
import { AutoSlot } from "./AutoSlot.js";

const patchedSkeletonJsonPrototypes = new WeakSet();
const patchedBonePrototypes = new WeakSet();
const regionWorldVerticesUseSlot = typeof SpineCore.RegionAttachment.prototype.updateRegion === "function";

function updateSkeletonWorldTransform(skeleton, deltaTime) {
  const physics = Reflect.get(SpineCore, "Physics");
  if (physics) {
    if (deltaTime !== undefined) skeleton.update(deltaTime);
    skeleton.updateWorldTransform(physics.update);
  } else {
    skeleton.updateWorldTransform();
  }
}

function computeRegionWorldVertices(attachment, slot, vertices, offset, stride) {
  attachment.computeWorldVertices(regionWorldVerticesUseSlot ? slot : slot.bone, vertices, offset, stride);
}

function getAttachmentTexture(attachment) {
  const { region } = attachment;
  return region.renderObject?.page?.texture ?? region.texture;
}

function setBufferUpdateRange(buffer, count) {
  if (typeof buffer.addUpdateRange === "function") {
    buffer.clearUpdateRanges();
    buffer.addUpdateRange(0, count);
  } else {
    buffer.updateRange.offset = 0;
    buffer.updateRange.count = count;
  }
}

function patchBone() {
  const prototype = SpineCore.Bone.prototype;
  if (patchedBonePrototypes.has(prototype)) return;
  if (!prototype.getWorldScale) {
    Object.defineProperty(prototype, "getWorldScale", {
      configurable: true,
      writable: true,
      value() {
        let x = this.scaleX;
        let y = this.scaleY;
        if (this.parent) {
          const parentScale = this.parent.getWorldScale();
          x *= parentScale.x;
          y *= parentScale.y;
        }
        return { x, y };
      },
    });
  }
  patchedBonePrototypes.add(prototype);
}

function patchSkeletonJson() {
  const prototype = SpineCore.SkeletonJson.prototype;
  if (patchedSkeletonJsonPrototypes.has(prototype)) return;
  const readSkeletonData = prototype.readSkeletonData;
  prototype.readSkeletonData = function readSkeletonDataWithExtras(json) {
    const source = typeof json === "string" ? JSON.parse(json) : json;
    const skeletonData = readSkeletonData.call(this, json);
    skeletonData.extra = source.extra || {};
    skeletonData.extraConfig = source.extraConfig || {};
    skeletonData.extraSlot = source.extraSlot || {};
    return skeletonData;
  };
  patchedSkeletonJsonPrototypes.add(prototype);
}

function toThreeJsBlending(blendMode) {
  switch (blendMode) {
    case SpineCore.BlendMode.Normal:
      return THREE.NormalBlending;
    case SpineCore.BlendMode.Additive:
      return THREE.AdditiveBlending;
    case SpineCore.BlendMode.Multiply:
      return THREE.MultiplyBlending;
    case SpineCore.BlendMode.Screen:
      return THREE.CustomBlending;
    default:
      throw new Error(`Unknown blendMode: ${blendMode}`);
  }
}

export class SkeletonMeshMaterial extends THREE.ShaderMaterial {
  constructor(customizer) {
    const parameters = {
      uniforms: { diffuse: { type: "t", value: null } },
      vertexShader: `
        attribute vec4 color;
        varying vec2 vUv;
        varying vec4 vColor;
        void main() {
          vUv = uv;
          vColor = color;
          gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D diffuse;
        varying vec2 vUv;
        varying vec4 vColor;
        void main(void) {
          gl_FragColor = texture2D(diffuse, vUv)*vColor;
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      alphaTest: 0.5,
    };
    customizer(parameters);
    super(parameters);
  }
}

function assignTexture(material, depthMaterial, texture, blending) {
  material.uniforms.diffuse.value = texture;
  material.blending = blending;
  material.blendDst = blending === THREE.CustomBlending ? THREE.OneMinusSrcColorFactor : THREE.OneMinusSrcAlphaFactor;
  material.blendSrc = blending === THREE.CustomBlending ? THREE.OneFactor : THREE.SrcAlphaFactor;
  material.needsUpdate = true;
  if (depthMaterial) {
    depthMaterial.uniforms.diffuse.value = texture;
    depthMaterial.needsUpdate = true;
  }
}

export class MeshBatcher extends THREE.Mesh {
  static VERTEX_SIZE = 9;

  constructor(maxVertices = 10920, materialCustomizer = () => {}, depthMaterialCustomizer) {
    super();
    this.isFlatRenderObject = true;
    this.materialCustomizer = materialCustomizer;
    this.verticesLength = 0;
    this.indicesLength = 0;
    this.materialGroups = [];
    if (maxVertices > 10920) {
      throw new Error(`Can't have more than 10920 triangles per batch: ${maxVertices}`);
    }
    this.vertices = new Float32Array(maxVertices * MeshBatcher.VERTEX_SIZE);
    this.indices = new Uint16Array(3 * maxVertices);
    const geometry = new THREE.BufferGeometry();
    this.vertexBuffer = new THREE.InterleavedBuffer(this.vertices, MeshBatcher.VERTEX_SIZE);
    this.vertexBuffer.usage = THREE.DynamicDrawUsage;
    geometry.setAttribute("position", new THREE.InterleavedBufferAttribute(this.vertexBuffer, 3, 0, false));
    geometry.setAttribute("color", new THREE.InterleavedBufferAttribute(this.vertexBuffer, 4, 3, false));
    geometry.setAttribute("uv", new THREE.InterleavedBufferAttribute(this.vertexBuffer, 2, 7, false));
    geometry.setIndex(new THREE.BufferAttribute(this.indices, 1));
    geometry.getIndex().usage = THREE.DynamicDrawUsage;
    geometry.drawRange.start = 0;
    geometry.drawRange.count = 0;
    this.geometry = geometry;
    this.material = [new SkeletonMeshMaterial(materialCustomizer)];
    if (depthMaterialCustomizer) {
      this.customDepthMaterial = new SkeletonMeshMaterial(depthMaterialCustomizer);
    }
  }

  dispose() {
    this.geometry.dispose();
    if (this.material instanceof THREE.Material) this.material.dispose();
    else if (this.material) {
      this.material.forEach((material) => {
        if (material instanceof THREE.Material) material.dispose();
      });
    }
    if (this.customDepthMaterial) this.customDepthMaterial.dispose();
  }

  clear() {
    this.geometry.drawRange.start = 0;
    this.geometry.drawRange.count = 0;
    this.geometry.clearGroups();
    this.materialGroups = [];
    if (this.material instanceof THREE.Material) {
      this.material.uniforms.diffuse.value = null;
      this.material.blending = THREE.NormalBlending;
    } else if (Array.isArray(this.material)) {
      this.material.forEach((material) => {
        material.uniforms.diffuse.value = null;
        material.blending = THREE.NormalBlending;
      });
    }
    return this;
  }

  begin() {
    this.verticesLength = 0;
    this.indicesLength = 0;
  }

  canBatch(verticesLength, indicesLength) {
    return !(this.indicesLength + indicesLength >= this.indices.byteLength / 2 || this.verticesLength + verticesLength >= this.vertices.byteLength / 2);
  }

  batch(vertices, verticesLength, indices, indicesLength, z = 0) {
    const indexStart = this.verticesLength / MeshBatcher.VERTEX_SIZE;
    let targetIndex = this.verticesLength;
    let sourceIndex = 0;
    while (sourceIndex < verticesLength) {
      this.vertices[targetIndex++] = vertices[sourceIndex++];
      this.vertices[targetIndex++] = vertices[sourceIndex++];
      this.vertices[targetIndex++] = z;
      this.vertices[targetIndex++] = vertices[sourceIndex++];
      this.vertices[targetIndex++] = vertices[sourceIndex++];
      this.vertices[targetIndex++] = vertices[sourceIndex++];
      this.vertices[targetIndex++] = vertices[sourceIndex++];
      this.vertices[targetIndex++] = vertices[sourceIndex++];
      this.vertices[targetIndex++] = vertices[sourceIndex++];
    }
    this.verticesLength = targetIndex;
    targetIndex = this.indicesLength;
    for (sourceIndex = 0; sourceIndex < indicesLength; sourceIndex += 1) {
      this.indices[targetIndex++] = indices[sourceIndex] + indexStart;
    }
    this.indicesLength += indicesLength;
  }

  end() {
    this.vertexBuffer.needsUpdate = this.verticesLength > 0;
    setBufferUpdateRange(this.vertexBuffer, this.verticesLength);
    this.closeMaterialGroups();
    const index = this.geometry.getIndex();
    index.needsUpdate = this.indicesLength > 0;
    setBufferUpdateRange(index, this.indicesLength);
    this.geometry.drawRange.start = 0;
    this.geometry.drawRange.count = this.indicesLength;
  }

  addMaterialGroup(count, materialIndex) {
    const group = this.materialGroups[this.materialGroups.length - 1];
    if (group === undefined || group[2] !== materialIndex) {
      this.materialGroups.push([this.indicesLength, count, materialIndex]);
    } else {
      group[1] += count;
    }
  }

  closeMaterialGroups() {
    this.materialGroups.forEach(([start, count, materialIndex]) => {
      this.geometry.addGroup(start, count, materialIndex);
    });
  }

  findMaterialGroup(texture, blendMode) {
    const blending = toThreeJsBlending(blendMode);
    if (!Array.isArray(this.material)) {
      throw new Error("MeshBatcher.material needs to be an array for geometry groups to work");
    }
    for (let index = 0; index < this.material.length; index += 1) {
      const material = this.material[index];
      if (material.uniforms.diffuse.value === null) {
        assignTexture(material, this.customDepthMaterial, texture, blending);
        return index;
      }
      if (material.uniforms.diffuse.value === texture && material.blending === blending) {
        return index;
      }
    }
    const material = new SkeletonMeshMaterial(this.materialCustomizer);
    assignTexture(material, this.customDepthMaterial, texture, blending);
    this.material.push(material);
    return this.material.length - 1;
  }
}

function initializeSkeletonMesh(skeletonMesh, skeletonData, materialCustomizer, depthMaterialCustomizer, maxVertices) {
  skeletonMesh.maxVert = maxVertices;
  delete skeletonMesh.materialCustomerizer;
  skeletonMesh.materialCustomizer = materialCustomizer;
  skeletonMesh.depthMaterialCustomizer = depthMaterialCustomizer;
  updateSkeletonWorldTransform(skeletonMesh.skeleton);
  skeletonMesh.autoBone = Object.keys(skeletonData.extra)
    .map((key) => skeletonData.extra[key])
    .map((config) => new AutoBone(config, skeletonMesh));
  skeletonMesh.autoSlot = Object.keys(skeletonData.extraSlot)
    .map((key) => skeletonData.extraSlot[key])
    .map((config) => new AutoSlot(config, skeletonMesh));
  skeletonMesh.autoBoneSpeed = new BoneSpeedConfig(skeletonData.extraConfig);
  skeletonMesh.isSpine = true;
  skeletonMesh.prevTime = 0;
  return skeletonMesh;
}

class SkeletonMeshPatchTemplate extends SpineThreeJs.SkeletonMesh {
  static QUAD_TRIANGLES = [0, 1, 2, 2, 3, 0];
  static VERTEX_SIZE = 8;

  constructor(skeletonData, materialCustomizer, depthMaterialCustomizer, maxVertices = 2048) {
    super(skeletonData, materialCustomizer);
    initializeSkeletonMesh(this, skeletonData, materialCustomizer, depthMaterialCustomizer, maxVertices);
  }

  update(deltaTime, time) {
    const state = this.state;
    const skeleton = this.skeleton;
    state.update(deltaTime);
    state.apply(skeleton);
    let mix = 1;
    let mixingFromName = null;
    const scaledTime = time * this.autoBoneSpeed.timeScale * this.state.timeScale;
    if (state.tracks.length) {
      mix = state.tracks[0].mixDuration ? Math.min(1, state.tracks[0].mixTime / state.tracks[0].mixDuration) : 1;
      if (mix < 1 && state.tracks[0].mixingFrom) {
        mixingFromName = state.tracks[0].mixingFrom.animation.name;
      }
    }
    const deltaScale = Math.min(2, Math.abs(scaledTime - this.prevTime) / 0.0167);
    this.prevTime = scaledTime;
    this.autoBone.forEach((autoBone) => {
      autoBone.render(deltaScale, scaledTime, mix, mixingFromName);
    });
    this.autoSlot.forEach((autoSlot) => autoSlot.render(scaledTime));
    updateSkeletonWorldTransform(skeleton, deltaTime);
    this.updateGeometry();
  }

  clearBatches() {
    this.batches.forEach((batch) => batch.clear());
    this.nextBatchIndex = 0;
  }

  nextBatch() {
    if (this.batches.length === this.nextBatchIndex) {
      const batch = new MeshBatcher(this.maxVert, this.materialCustomizer, this.depthMaterialCustomizer);
      this.add(batch);
      this.batches.push(batch);
    }
    const batch = this.batches[this.nextBatchIndex++];
    if (this.renderOrder) batch.renderOrder = this.renderOrder - 0.1;
    batch.castShadow = this.castShadow;
    batch.receiveShadow = this.receiveShadow;
    batch.frustumCulled = this.frustumCulled;
    return batch;
  }

  updateGeometry() {
    this.clearBatches();
    const tempPosition = this.tempPos;
    const tempUv = this.tempUv;
    const tempLight = this.tempLight;
    const tempDark = this.tempDark;
    const clipper = this.clipper;
    let vertices = this.vertices;
    let triangles = null;
    let uvs = null;
    const drawOrder = this.skeleton.drawOrder;
    let batch = this.nextBatch();
    batch.begin();
    let z = 0;
    const zOffset = this.zOffset;

    for (let slotIndex = 0; slotIndex < drawOrder.length; slotIndex += 1) {
      const vertexSize = clipper.isClipping() ? 2 : SkeletonMeshPatchTemplate.VERTEX_SIZE;
      const slot = drawOrder[slotIndex];
      if (slot && slot.bone && slot.bone.active) {
        const attachment = slot.getAttachment();
        let attachmentColor = null;
        let texture = null;
        let vertexCount = 0;
        if (attachment instanceof SpineCore.RegionAttachment) {
          attachmentColor = attachment.color;
          vertices = this.vertices;
          vertexCount = 4 * vertexSize;
          computeRegionWorldVertices(attachment, slot, vertices, 0, vertexSize);
          triangles = SkeletonMeshPatchTemplate.QUAD_TRIANGLES;
          uvs = attachment.uvs;
          texture = getAttachmentTexture(attachment);
        } else if (attachment instanceof SpineCore.MeshAttachment) {
          attachmentColor = attachment.color;
          vertices = this.vertices;
          vertexCount = (attachment.worldVerticesLength >> 1) * vertexSize;
          if (vertexCount > vertices.length) {
            vertices = this.vertices = SpineCore.Utils.newFloatArray(vertexCount);
          }
          attachment.computeWorldVertices(slot, 0, attachment.worldVerticesLength, vertices, 0, vertexSize);
          triangles = attachment.triangles;
          uvs = attachment.uvs;
          texture = getAttachmentTexture(attachment);
        } else if (attachment instanceof SpineCore.ClippingAttachment) {
          clipper.clipStart(slot, attachment);
          continue;
        } else {
          clipper.clipEndWithSlot(slot);
          continue;
        }

        if (texture != null) {
          const skeletonColor = slot.bone.skeleton.color;
          const slotColor = slot.color;
          const alpha = skeletonColor.a * slotColor.a * attachmentColor.a;
          const color = this.tempColor;
          color.set(
            skeletonColor.r * slotColor.r * attachmentColor.r,
            skeletonColor.g * slotColor.g * attachmentColor.g,
            skeletonColor.b * slotColor.b * attachmentColor.b,
            alpha,
          );
          let finalVertices;
          let finalVerticesLength;
          let finalIndices;
          let finalIndicesLength;
          if (clipper.isClipping()) {
            clipper.clipTriangles(vertices, vertexCount, triangles, triangles.length, uvs, color, null, false);
            finalVertices = clipper.clippedVertices;
            finalIndices = clipper.clippedTriangles;
            if (this.vertexEffect) {
              for (let index = 0; index < finalVertices.length; index += vertexSize) {
                tempPosition.x = finalVertices[index];
                tempPosition.y = finalVertices[index + 1];
                tempLight.setFromColor(color);
                tempDark.set(0, 0, 0, 0);
                tempUv.x = finalVertices[index + 6];
                tempUv.y = finalVertices[index + 7];
                this.vertexEffect.transform(tempPosition, tempUv, tempLight, tempDark);
                finalVertices[index] = tempPosition.x;
                finalVertices[index + 1] = tempPosition.y;
                finalVertices[index + 2] = tempLight.r;
                finalVertices[index + 3] = tempLight.g;
                finalVertices[index + 4] = tempLight.b;
                finalVertices[index + 5] = tempLight.a;
                finalVertices[index + 6] = tempUv.x;
                finalVertices[index + 7] = tempUv.y;
              }
            }
            finalVerticesLength = finalVertices.length;
            finalIndicesLength = finalIndices.length;
          } else {
            finalVertices = vertices;
            if (this.vertexEffect) {
              for (let vertexIndex = 0, uvIndex = 0; vertexIndex < vertexCount; vertexIndex += vertexSize, uvIndex += 2) {
                tempPosition.x = vertices[vertexIndex];
                tempPosition.y = vertices[vertexIndex + 1];
                tempLight.setFromColor(color);
                tempDark.set(0, 0, 0, 0);
                tempUv.x = uvs[uvIndex];
                tempUv.y = uvs[uvIndex + 1];
                this.vertexEffect.transform(tempPosition, tempUv, tempLight, tempDark);
                vertices[vertexIndex] = tempPosition.x;
                vertices[vertexIndex + 1] = tempPosition.y;
                vertices[vertexIndex + 2] = tempLight.r;
                vertices[vertexIndex + 3] = tempLight.g;
                vertices[vertexIndex + 4] = tempLight.b;
                vertices[vertexIndex + 5] = tempLight.a;
                vertices[vertexIndex + 6] = tempUv.x;
                vertices[vertexIndex + 7] = tempUv.y;
              }
            } else {
              for (let vertexIndex = 2, uvIndex = 0; vertexIndex < vertexCount; vertexIndex += vertexSize, uvIndex += 2) {
                vertices[vertexIndex] = color.r;
                vertices[vertexIndex + 1] = color.g;
                vertices[vertexIndex + 2] = color.b;
                vertices[vertexIndex + 3] = color.a;
                vertices[vertexIndex + 4] = uvs[uvIndex];
                vertices[vertexIndex + 5] = uvs[uvIndex + 1];
              }
            }
            finalVerticesLength = vertexCount;
            finalIndices = triangles;
            finalIndicesLength = triangles.length;
          }

          if (finalVerticesLength === 0 || finalIndicesLength === 0) {
            clipper.clipEndWithSlot(slot);
            continue;
          }
          if (!batch.canBatch(finalVerticesLength, finalIndicesLength)) {
            batch.end();
            batch = this.nextBatch();
            batch.begin();
          }
          const materialIndex = batch.findMaterialGroup(texture.texture, slot.data.blendMode);
          batch.addMaterialGroup(finalIndicesLength, materialIndex);
          batch.batch(finalVertices, finalVerticesLength, finalIndices, finalIndicesLength, z);
          z += zOffset;
        }
        clipper.clipEndWithSlot(slot);
      } else {
        clipper.clipEndWithSlot(slot);
      }
    }
    clipper.clipEnd();
    batch.end();
  }
}

patchBone();
patchSkeletonJson();

const skeletonMeshDescriptors = Object.getOwnPropertyDescriptors(SkeletonMeshPatchTemplate.prototype);
delete skeletonMeshDescriptors.constructor;
Object.defineProperties(SpineThreeJs.SkeletonMesh.prototype, skeletonMeshDescriptors);

export const SkeletonMesh = new Proxy(SpineThreeJs.SkeletonMesh, {
  construct(Target, args, newTarget) {
    const [skeletonData, materialCustomizer, depthMaterialCustomizer, maxVertices = 2048] = args;
    const skeletonMesh = Reflect.construct(Target, [skeletonData, materialCustomizer], newTarget);
    return initializeSkeletonMesh(skeletonMesh, skeletonData, materialCustomizer, depthMaterialCustomizer, maxVertices);
  },
});
Object.defineProperty(SkeletonMesh, "length", { configurable: true, value: 3 });
SkeletonMesh.QUAD_TRIANGLES = SkeletonMeshPatchTemplate.QUAD_TRIANGLES;
SkeletonMesh.VERTEX_SIZE = SkeletonMeshPatchTemplate.VERTEX_SIZE;

export const threejs = {
  ...SpineThreeJs,
  MeshBatcher,
  SkeletonMeshMaterial,
  SkeletonMesh,
};

export const SpineRuntime = {
  ...SpineCore,
  SkeletonMeshMaterial,
  threejs,
};

export { AutoBone, AutoSlot, BoneSpeedConfig };
export default SpineRuntime;
