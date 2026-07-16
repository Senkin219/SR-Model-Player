import * as THREE from "three";
import BinaryDecoderModule from "../codec/BinaryModelDecoder.js";
import { SourceLoad, createSourceLoader, sourceLoader } from "../loaders/AssetLoader.js";
import { createLoader, loader } from "../loaders/Loader.js";
import passSettings from "../passes/index.js";
import MSDFRuntime from "../runtime/msdf.js";
import SpineRuntime from "../runtime/spine/index.js";
import TimelineFactory from "../timeline/TimelineFactory.js";
import { createGradientTexture } from "../timeline/gradient.js";
import { cameraAdaptScreen, getCamera } from "./camera.js";
import eventDispatcher from "./events.js";
import Mouse from "./mouse/index.js";
import { getSceneData } from "./scene.js";

const geometryConstructors = {
  1: THREE.BufferGeometry,
  2: THREE.InstancedBufferGeometry,
};

const attributeConstructors = {
  1: THREE.BufferAttribute,
  2: THREE.InstancedBufferAttribute,
  3: THREE.InterleavedBufferAttribute,
};

class CapsuleGeometry extends THREE.LatheBufferGeometry {
  constructor(radius = 1, height = 1, capSegments = 4, radialSegments = 8) {
    const path = new THREE.Path();
    path.absarc(0, -height / 2, radius, 1.5 * Math.PI, 0);
    path.absarc(0, height / 2, radius, 0, 0.5 * Math.PI);
    super(path.getPoints(capSegments), radialSegments);
    this.type = "CapsuleGeometry";
    this.parameters = { radius, height, capSegments, radialSegments };
  }

  static fromJSON(data) {
    return new CapsuleGeometry(data.radius, data.length, data.capSegments, data.radialSegments);
  }
}

function parseVectorString(value) {
  return value
    .slice(1, -1)
    .split(",")
    .map((item) => Number.parseFloat(item));
}

function parseOptionValue(value) {
  if (value === "false" || value === "true") return value === "true";
  return Number.isNaN(Number.parseInt(value)) ? value : Number.parseInt(value);
}

function createCubeRenderTarget(player, bufferName, source = {}) {
  if (player.buffers[bufferName]?.isWebGLCubeRenderTarget) return player.buffers[bufferName];
  player.buffers[bufferName]?.dispose?.();
  const size = source.size ?? source.width ?? 512;
  const renderTarget = new THREE.WebGLCubeRenderTarget(size, {
    format: source.format ?? THREE.RGBAFormat,
    type: source.dataType ?? THREE.UnsignedByteType,
    generateMipmaps: source.generateMipmaps ?? true,
    minFilter: source.minFilter ?? THREE.LinearMipMapLinearFilter,
    depthBuffer: source.depthBuffer ?? true,
    stencilBuffer: source.stencilBuffer ?? false,
  });
  renderTarget.resizable = false;
  player.initBuffer(bufferName, renderTarget);
  return renderTarget;
}

export class ThreePlayer {
  constructor(options) {
    const {
      devSpeed = 1,
      renderer = null,
      layoutData = { geometries: {}, sceneList: [] },
      animationSetting = {},
      shaderSetting = {},
      bufferSetting = {},
      spineSetting = {},
      pluginSetting = {},
      fontSetting = {},
      imageSetting = {},
      timelineSetting = {},
      modifierSetting = {},
      machineSetting = {},
      classSetting = {},
      uniformSetting = {
        fps: { value: 1 },
        delta: { value: 0.016 },
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(1, 1) },
        mouse: { value: new THREE.Vector2() },
        offset: { value: new THREE.Vector2() },
        mouseDelta: { value: new THREE.Vector2() },
      },
    } = options || {};

    this.renderer = renderer;
    this.devSpeed = devSpeed;
    const context = renderer.getContext();
    this.animationSetting = animationSetting;
    this.shaderSetting = shaderSetting;
    this.spineSetting = spineSetting;
    this.bufferSetting = bufferSetting;
    this.uniformSetting = uniformSetting;
    this.modifierSetting = modifierSetting;
    this.fontSetting = fontSetting;
    this.pluginSetting = pluginSetting;
    this.timelineSetting = timelineSetting;
    this.classSetting = classSetting;
    this.imageSetting = imageSetting;
    this.machineSetting = machineSetting;
    this.clock = new THREE.Clock();

    this.reportData = {
      tickTime: 0,
      tickCount: 0,
      hasReported: false,
    };

    const player = this;
    this.defaultAnimationSetting = {
      SKIN: function SKIN() {
        if (this.scene.autoUpdate) {
          this.userData.animationMixer.update(player.uniformSetting.delta.value);
        }
      },
      SPINE: function SPINE() {
        if (!this.scene || this.scene.autoUpdate) {
          this.update(player.uniformSetting.delta.value, player.uniformSetting.time.value);
        }
      },
      DRAW_MASK: function DRAW_MASK() {
        context.clearStencil(0);
        context.clear(context.STENCIL_BUFFER_BIT);
        context.stencilFunc(context.ALWAYS, 1, 1);
        context.stencilOp(context.REPLACE, context.REPLACE, context.REPLACE);
        context.colorMask(false, false, false, false);
        context.enable(context.STENCIL_TEST);
      },
      BEGIN_INVERT_MASK: function BEGIN_INVERT_MASK() {
        context.stencilFunc(context.NOTEQUAL, 1, 1);
        context.stencilOp(context.KEEP, context.KEEP, context.KEEP);
        context.colorMask(true, true, true, true);
      },
      BEGIN_MASK: function BEGIN_MASK() {
        context.stencilFunc(context.EQUAL, 1, 1);
        context.stencilOp(context.KEEP, context.KEEP, context.KEEP);
        context.colorMask(true, true, true, true);
      },
      STOP_MASK: function STOP_MASK() {
        context.disable(context.STENCIL_TEST);
      },
    };

    this.geometries = {};
    this.shaders = {};
    this.spines = {};
    this.textures = {};
    this.buffers = {};
    this.fonts = {};
    this.sourcePool = {};
    this.loader = new SourceLoad({ sourcePool: this.sourcePool });
    this.timelines = {};
    this.skinning = {};
    this.skeletons = {};
    this.exportResources = {};
    this.mouseController = null;
    this.scenes = {};
    this.layoutData = layoutData;

    this.initLayout(layoutData);
  }

  static decode(source) {
    return BinaryDecoderModule.Decoder.parse(source);
  }

  static updateTextTexture(texture, text) {
    const canvas = texture.image;
    const context = canvas.getContext("2d");
    const options = texture.opt;

    if (options.background) {
      context.fillStyle = options.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    context.fillStyle = options.color;
    context.textBaseline = options.baseline;
    context.textAlign = options.align;
    context.font = [options.style, options.variant, options.weight, `${options.size}px`, options.family].join(" ");
    if (options.strokeStyle && options.strokeWidth) {
      context.lineWidth = options.strokeWidth;
      context.strokeStyle = options.strokeStyle;
    }

    let lineIndex = 0;
    const sourceLines = text.split(/(?:\r\n|\r|\n)/);
    sourceLines.forEach((sourceLine) => {
      let line = sourceLine;
      let measuredWidth = context.measureText(line).width;
      if (measuredWidth > options.lineWidth) {
        const chunks = sourceLine
          .split(/(\s|[\u4e00-\u9fa5,\uac00-\ud7af,\u0e00-\u0e7f]+)/)
          .filter(Boolean)
          .flatMap((chunk) => (/([\u4e00-\u9fa5]+)/.test(chunk) ? chunk.split("") : [chunk]));
        [line] = chunks;
        measuredWidth = context.measureText(line).width;
        for (let index = 1; index < chunks.length; index += 1) {
          const chunkWidth = context.measureText(chunks[index]).width;
          if (measuredWidth + chunkWidth >= options.lineWidth) {
            if (options.strokeStyle && options.strokeWidth) {
              context.strokeText(line, options.x, options.y + lineIndex * options.lineHeight);
            }
            context.fillText(line, options.x, options.y + lineIndex * options.lineHeight);
            if (chunks[index] !== " ") {
              line = chunks[index];
              measuredWidth = chunkWidth;
            } else {
              line = "";
              measuredWidth = 0;
            }
            lineIndex += 1;
          } else {
            line += chunks[index];
            measuredWidth += chunkWidth;
          }
        }
      }
      if (options.strokeStyle && options.strokeWidth) {
        context.strokeText(line, options.x, options.y + lineIndex * options.lineHeight);
      }
      context.fillText(line, options.x, options.y + lineIndex * options.lineHeight);
      lineIndex += 1;
    });

    texture.needsUpdate = true;
    return {
      count: lineIndex,
      opt: options,
      width: canvas.width,
      height: canvas.height,
    };
  }

  static buildMorph(mesh) {
    if (!mesh?.material || !mesh.geometry?.attributes.morphTarget0) return;
    mesh.morphTargetInfluences = [];
    Object.keys(mesh.geometry.attributes).forEach((attributeName) => {
      if (attributeName.startsWith("morphTarget")) mesh.morphTargetInfluences.push(0);
    });
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      material.uniforms.morphTargetInfluences = { value: mesh.morphTargetInfluences };
      material.defines.USE_MORPH = mesh.morphTargetInfluences.length;
    });
  }

  static getTextTexture(query) {
    const canvas = document.createElement("canvas");
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    ThreePlayer.setParameter(texture, query, "wrapT");
    ThreePlayer.setParameter(texture, query, "wrapS");
    ThreePlayer.setParameter(texture, query, "minFilter");
    texture.minFilter = THREE.LinearFilter;

    const width = ThreePlayer.getParameter(query, "width") || 300;
    const height = ThreePlayer.getParameter(query, "height") || 300;
    if (texture.minFilter !== THREE.LinearFilter || texture.wrapS !== THREE.ClampToEdgeWrapping || texture.wrapT !== THREE.ClampToEdgeWrapping) {
      canvas.width = 2 ** Math.ceil(Math.log(width) / Math.LN2);
      canvas.height = 2 ** Math.ceil(Math.log(height) / Math.LN2);
    } else {
      canvas.width = width;
      canvas.height = height;
    }

    const bodyFont = typeof getComputedStyle === "function" ? getComputedStyle(document.body).fontFamily : "Microsoft YaHei,微软雅黑";
    texture.opt = {
      family: bodyFont,
      color: "#fff",
      align: "center",
      style: "normal",
      variant: "normal",
      weight: "bolder",
      size: "26",
      baseline: "top",
      x: 0,
      y: 0,
      scaleX: canvas.width / width,
      scaleY: canvas.height / height,
      lineWidth: canvas.width,
      lineHeight: "26",
      background: null,
      strokeStyle: null,
      strokeWidth: null,
    };
    [
      "background",
      "color",
      "align",
      "family",
      "style",
      "variant",
      "weight",
      "size",
      "x",
      "y",
      "baseline",
      "lineWidth",
      "lineHeight",
      "strokeStyle",
      "strokeWidth",
    ].forEach((key) => ThreePlayer.setParameter(texture.opt, query, key));
    canvas.getContext("2d").scale(texture.opt.scaleX, texture.opt.scaleY);
    const text = ThreePlayer.getParameter(query, "text");
    if (text) ThreePlayer.updateTextTexture(texture, text);
    return texture;
  }

  static updateProp(target, values) {
    Object.keys(values).forEach((key) => {
      target[key] = values[key];
    });
  }

  static getEventDispatcher() {
    return eventDispatcher;
  }

  static getLoader() {
    return loader;
  }

  static createLoader() {
    return createLoader();
  }

  static getSourceLoader() {
    return sourceLoader;
  }

  static createSourceLoader() {
    return createSourceLoader();
  }

  static getParameter(query, key) {
    const match = query.match(new RegExp(`(^|&)${key}=([^&]*)(&|$)`));
    return match ? match[2] : null;
  }

  static getParameters(query) {
    const parameters = {};
    query.split("&").forEach((item) => {
      const [key, value] = item.split("=");
      parameters[key] = Number.parseInt(value, 10);
    });
    return parameters;
  }

  static setParameter(target, query, key) {
    const value = ThreePlayer.getParameter(query, key);
    if (!value) return false;
    const previous = target[key];
    target[key] = Number.isNaN(Number(value)) ? value : Number.parseInt(value);
    return previous !== target[key];
  }

  static getObjScreenElePos(object, camera, viewport) {
    const { width, height } = viewport;
    camera.updateMatrixWorld();
    const position = new THREE.Vector3(0, 0, 0);
    object.getWorldPosition(position);
    position.project(camera);
    return {
      position: "absolute",
      transform: `translate(calc(-50% + ${((position.x * width) / 100 / 2).toFixed(2)}rem), calc(-50% + ${((-position.y * height) / 100 / 2).toFixed(2)}rem))`,
      left: "50%",
      top: "50%",
    };
  }

  static getObjWorldPos(x, y, camera, viewport) {
    const cameraRight = camera.right / camera.zoom / 100;
    const cameraTop = camera.top / camera.zoom / 100;
    const { width, height } = viewport;
    const halfWidth = width / 2 / 100;
    const halfHeight = height / 2 / 100;
    const widthOffset = halfWidth - cameraRight;
    const heightOffset = halfHeight - cameraTop;
    const normalizedX = x > 0 ? (halfWidth - (widthOffset + x)) / halfWidth : -(halfWidth - (widthOffset - x)) / halfWidth;
    const normalizedY = y > 0 ? (halfHeight - (heightOffset + y)) / halfHeight : -(halfHeight - (heightOffset - y)) / halfHeight;
    return new THREE.Vector3((normalizedX * width) / 2, (normalizedY * height) / 2, 0);
  }

  createLoader() {
    return new SourceLoad({ sourcePool: this.sourcePool });
  }

  getSourcePoolResult(id) {
    return this.sourcePool[id] ? this.sourcePool[id].result : null;
  }

  checkGPUAcceleratorEnabled() {
    const context = this.renderer.getContext();
    const debugRendererInfo = context.getExtension("WEBGL_debug_renderer_info");
    if (debugRendererInfo) {
      const renderer = context.getParameter(debugRendererInfo.UNMASKED_RENDERER_WEBGL);
      return !/SwiftShader/gi.test(renderer);
    }
    return false;
  }

  reportRenderInfo(reportAfter, callback) {
    const { tickTime, tickCount, hasReported } = this.reportData;
    if (tickTime >= reportAfter && !hasReported) {
      this.reportData.hasReported = true;
      const report = {
        averageFps: Number.parseInt(tickCount / tickTime, 10),
        gpu: null,
        maxTextureSize: null,
        resolution: `${Number.parseInt(this.uniformSetting.resolution.value.x, 10)}-${Number.parseInt(this.uniformSetting.resolution.value.y, 10)}`,
        ua: window.navigator.userAgent,
      };
      const context = this.renderer.getContext();
      const debugRendererInfo = context.getExtension("WEBGL_debug_renderer_info");
      if (debugRendererInfo) {
        report.gpu = context.getParameter(debugRendererInfo.UNMASKED_RENDERER_WEBGL) || null;
        report.maxTextureSize = context.getParameter(context.MAX_TEXTURE_SIZE) || null;
      }
      callback(report);
      return;
    }
    this.reportData.tickTime += this.uniformSetting.delta.value;
    this.reportData.tickCount += 1;
  }

  initLayout(layout) {
    const bufferMap = layout.bufferMap === undefined ? {} : layout.bufferMap;
    this.initGeometry(layout);
    layout.sceneList.forEach((sceneData) => {
      const classId = sceneData.classConfig?.id;
      const SceneConstructor = this.classSetting[classId] || THREE.Scene;
      const scene = new SceneConstructor();
      const camera = getCamera(sceneData.camera[0], sceneData.sceneConfig);
      if (sceneData.buffer === undefined) {
        scene.buffer = sceneData.id === "scene_ui" ? null : this.getBuffer(sceneData.id, bufferMap[sceneData.id]);
      } else {
        scene.buffer = this.getBuffer(sceneData.buffer, bufferMap[sceneData.buffer]);
      }
      scene.name = sceneData.id;
      scene.camera = camera;
      scene.sceneInited = false;
      scene.sceneConfig = sceneData.sceneConfig;
      this.scenes[sceneData.id] = scene;
    });
  }

  renderScene(sceneName, clear = true, renderTarget) {
    const scene = this.getScene(sceneName);
    if (scene.overrideRender) {
      scene.overrideRender(clear, renderTarget);
      return;
    }
    this.renderer.setRenderTarget(scene.buffer);
    if (clear) this.renderer.clear();
    this.renderer.render(scene, scene.camera);
  }

  resizeUI(width, height, settings) {
    const { scale = 1, isFixedSize = false, maxResolution = 2500, all = false } = settings;
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    const ratio = scaledWidth / scaledHeight;
    const renderWidth = ratio >= 1 ? Math.min(maxResolution, scaledWidth) : Math.min(maxResolution, scaledHeight) * ratio;
    const renderHeight = ratio >= 1 ? Math.min(maxResolution, scaledWidth) / ratio : Math.min(maxResolution, scaledHeight);

    this.renderer.setSize(renderWidth, renderHeight);
    cameraAdaptScreen(this.getScene("scene_ui").camera, settings, renderWidth, renderHeight);
    if (!isFixedSize) {
      if (all) {
        Object.values(this.buffers).forEach((buffer) => {
          if (buffer?.resizable) buffer.setSize(renderWidth, renderHeight);
        });
      } else {
        Object.values(this.scenes).forEach((scene) => {
          if (scene.buffer?.resizable) scene.buffer.setSize(renderWidth, renderHeight);
        });
      }
      this.uniformSetting.resolution.value.set(renderWidth, renderHeight);
    }
    return { width: renderWidth, height: renderHeight };
  }

  getScene(sceneName) {
    const scene = this.scenes[sceneName];
    if (scene.children.length === 0) {
      this.initScene(getSceneData(this.layoutData, sceneName), scene);
    }
    return scene;
  }

  getBufferAnimationFunc(config) {
    return {
      onBufferClick(event) {
        globalThis.bufferAnimationSceneHitTest.call(this, "onClick", event, config.dom);
      },
      onBufferDown(event) {
        globalThis.bufferAnimationSceneHitTest.call(this, "onMouseDown", event, config.dom);
      },
      onBufferUp(event) {
        globalThis.bufferAnimationSceneHitTest.call(this, "onMouseUp", event, config.dom);
      },
      onBufferMove(event) {
        globalThis.bufferAnimationSceneHitTest.call(this, "onMouseMove", event, config.dom);
      },
    };
  }

  drawCopy(input, output, options) {
    const { resize = false } = options || {};
    if (input !== output) passSettings.copyPass.render(this.renderer, input, output, resize);
  }

  drawBlur(input, output, options) {
    const { resize = false, x = 1, y = 1, target, camera } = options || {};
    if (x > 0.01 || y > 0.01) {
      passSettings.blurPass.render(this.renderer, input, output, resize, x, y, target, camera);
    } else if (input !== output) {
      passSettings.copyPass.render(this.renderer, input, output, resize);
    }
  }

  getFont(fontId) {
    if (!this.fonts[fontId]) {
      this.fontSetting[fontId].json;
      this.fonts[fontId] = new MSDFRuntime.MSDFAtlas(fontId, this.fontSetting[fontId].json, this.getTexture(fontId));
    }
    return this.fonts[fontId];
  }

  createText(config, material) {
    return new MSDFRuntime.MSDFTextMesh(config.text, material, {
      atlas: this.getFont(config.font),
      dynamic: !config.static,
      needsCenterAttribute: config.nca,
      fontSize: config.fontSize,
      align: config.align,
      lineWidth: config.lineWidth,
      lineHeight: config.lineHeight,
      letterSpacing: config.letterSpacing,
      letterItalic: config.letterItalic,
      color: config.color,
      shadow:
        config.shadowColor !== undefined || config.shadowOpacity !== undefined || config.shadowOffset !== undefined
          ? {
              color: config.shadowColor ? new THREE.Color(config.shadowColor) : null,
              opacity: config.shadowOpacity,
              offset: config.shadowOffset ? new THREE.Vector2().fromArray(config.shadowOffset) : null,
            }
          : null,
    });
  }

  getTimeline(root, timelineName, options) {
    const { excludes = null } = options || {};
    const key = `${root.uuid}_${timelineName}`;
    if (!this.timelines[key]) {
      if (!this.timelineSetting[timelineName]) {
        throw new Error(`timeline ${timelineName} is not found`);
      }
      this.timelines[key] = TimelineFactory.createTimeline({
        ...this.timelineSetting[timelineName],
        methods: this.animationSetting,
        root,
      });
    }
    if (excludes) {
      this.timelines[key].traverse((timeline) => {
        timeline.weight = excludes.includes(timeline.name) ? 0 : 1;
      });
    }
    return this.timelines[key];
  }

  findTimeline(name) {
    const key = Object.keys(this.timelines).find((candidate) => candidate.includes(`_${name}`));
    return key ? this.timelines[key] : null;
  }

  stopTimeline(root, timelineName) {
    if (timelineName) this.getTimeline(root, timelineName)?.stop();
    else root._playedTimeline?.stop();
  }

  playTimeline(root, timelineName, options = {}) {
    if (this.devSpeed !== 1) options.speed = this.devSpeed;
    const { mix = 0, fps = 30, speed = 1, loop = false, overwrite = true, start = 0 } = options;
    const mixFrames = (1000 * mix) / speed / fps;
    if (overwrite) root._playedTimeline?.stop();

    if (Array.isArray(timelineName)) {
      const group = TimelineFactory.createTimeline({ type: 1 });
      root._playedTimeline = group;
      let offset = 0;
      timelineName.forEach((name, index) => {
        const timeline = this.getTimeline(root, name, options);
        timeline.start += offset;
        timeline.loop = index === timelineName.length - 1 && loop;
        offset += timeline.duration - mixFrames;
        group.add(timeline);
        if (index > 0 && mix !== 0) {
          group.add(
            TimelineFactory.createTimeline({
              start: timeline.start,
              type: 3,
              data: [{ start: 0, end: mixFrames, frames: [0, 1] }],
              name: ".weight",
              root: timeline,
            }),
          );
        }
      });
      return group.play(options);
    }

    const timeline = this.getTimeline(root, timelineName, options);
    timeline.loop = loop;
    if (mix === 0) {
      root._playedTimeline = timeline;
      return timeline.play(options);
    }

    const group = TimelineFactory.createTimeline({ type: 1 });
    const weightTimeline = TimelineFactory.createTimeline({
      start,
      type: 3,
      data: [{ start: 0, end: mixFrames, frames: [0, 1] }],
      name: ".weight",
      root: timeline,
    });
    group.add(weightTimeline);
    group.add(timeline);
    root._playedTimeline = group;
    return group.play(options);
  }

  initBuffer(bufferName, renderTarget) {
    this.buffers[bufferName] = renderTarget;
  }

  getBuffer(bufferName, source) {
    if (bufferName === "") return null;
    if (!this.buffers[bufferName]) {
      const {
        resizable = true,
        width = 512,
        height = 512,
        wrapS = THREE.ClampToEdgeWrapping,
        wrapT = THREE.ClampToEdgeWrapping,
        format = THREE.RGBAFormat,
        premultiplyAlpha = true,
        stencilBuffer = false,
        depthBuffer = true,
        generateMipmaps = false,
      } = source || {};
      const resolution = this.uniformSetting.resolution.value;
      const renderTarget = new THREE.WebGLRenderTarget(resizable ? resolution.x : width, resizable ? resolution.y : height, {
        wrapS,
        wrapT,
        format,
        stencilBuffer,
        depthBuffer,
        premultiplyAlpha,
        generateMipmaps,
      });
      renderTarget.resizable = resizable;
      this.initBuffer(bufferName, renderTarget);
    }
    return this.buffers[bufferName];
  }

  getImage(imageId) {
    return (
      (this.imageSetting[imageId] ? this.imageSetting[imageId].image : null) ||
      loader.getResult(imageId) ||
      sourceLoader.getResult(imageId) ||
      this.getSourcePoolResult(imageId)
    );
  }

  removeTexture(textureId) {
    const [id] = textureId.split("?");
    this.textures[id]?.dispose();
    delete this.textures[id];
  }

  initTexture(textureId) {
    const texture = this.getTexture(textureId);
    if (texture) this.renderer.setTexture(texture);
  }

  getTextureConfig(textureId) {
    const config = this.imageSetting[textureId]?.config;
    if (!config) return {};
    return {
      wrapS: config.wrapS || THREE.ClampToEdgeWrapping,
      wrapT: config.wrapT || THREE.ClampToEdgeWrapping,
      minFilter: config.minFilter || THREE.LinearFilter,
      magFilter: config.magFilter || THREE.LinearFilter,
      ...ThreePlayer.getParameters(config.other || ""),
    };
  }

  getTexture(textureQuery) {
    const [textureId, query] = textureQuery.split("?");
    let needsUpdate = false;
    if (!this.textures[textureId]) {
      const image = this.getImage(textureId);
      if (!image) return null;
      this.textures[textureId] = new THREE.Texture(image);
      this.textures[textureId].name = textureId;
      this.textures[textureId].minFilter = THREE.LinearFilter;
      needsUpdate = true;
    }

    const texture = this.textures[textureId];
    texture.name = textureId;
    if (query) {
      needsUpdate = ThreePlayer.setParameter(texture, query, "wrapS") || needsUpdate;
      needsUpdate = ThreePlayer.setParameter(texture, query, "wrapT") || needsUpdate;
      needsUpdate = ThreePlayer.setParameter(texture, query, "minFilter") || needsUpdate;
    } else {
      ThreePlayer.updateProp(texture, this.getTextureConfig(textureId));
    }
    texture.needsUpdate = needsUpdate;
    return texture;
  }

  getUniform(uniformData) {
    switch (uniformData.type) {
      case "f":
        return { value: uniformData.value, type: "f" };
      case "i":
        return { value: uniformData.value, type: "i" };
      case "v2":
        return {
          value: new THREE.Vector2().fromArray(Array.isArray(uniformData.value) ? uniformData.value : parseVectorString(uniformData.value)),
        };
      case "v3":
        return {
          value: new THREE.Vector3().fromArray(Array.isArray(uniformData.value) ? uniformData.value : parseVectorString(uniformData.value)),
        };
      case "v4":
        return {
          value: new THREE.Vector4().fromArray(Array.isArray(uniformData.value) ? uniformData.value : parseVectorString(uniformData.value)),
        };
      case "c":
        return { value: new THREE.Color(uniformData.value) };
      case "t":
        return { value: this.getTexture(uniformData.value), src: uniformData.value, type: "t" };
      case "w":
        return { value: ThreePlayer.getTextTexture(uniformData.value), type: "t" };
      case "b":
        return { value: this.getBuffer(uniformData.value).texture, type: "t" };
      case "u":
        return this.uniformSetting[uniformData.value] || { value: null };
      case "g":
        return { value: createGradientTexture(uniformData.value), type: "t" };
      default:
        return { value: uniformData.value };
    }
  }

  getMaterial(materialDataList, objectType) {
    if (materialDataList.length === 0) return undefined;
    const materials = materialDataList.map((materialData) => {
      const source = this.shaderSetting[materialData.id];
      if (!source) throw new Error(`unknown shader:${materialData.id}`);
      const material = source.clone();
      material.name = materialData.id;
      material.skinning = objectType === 2;

      ["transparent", "depthTest", "depthWrite", "side", "blending", "wireframe"].forEach((property) => {
        if (materialData[property] !== undefined) material[property] = materialData[property];
      });
      if (materialData.derivatives !== undefined) {
        material.extensions.derivatives = materialData.derivatives;
      }
      if (materialData.lights) {
        material.lights = true;
        material.uniforms = THREE.UniformsUtils.clone(THREE.UniformsLib.lights);
      }
      materialData.uniforms?.forEach((uniform) => {
        if (uniform.type === "t") material.defines.USE_TEXTURE = 1;
        material.uniforms[uniform.key] = this.getUniform(uniform);
      });
      materialData.globalUniform?.forEach((uniformName) => {
        material.uniforms[uniformName] = this.uniformSetting[uniformName];
      });
      if (materialData.defines) {
        material.defines = { ...material.defines, ...materialData.defines };
      }
      if (materialData.glsl3) material.glslVersion = THREE.GLSL3;
      materialData.others?.split("&").forEach((pair) => {
        const parts = pair.split("=");
        if (parts.length === 2) material[parts[0]] = parseOptionValue(parts[1]);
      });
      return material;
    });
    return materials.length === 1 ? materials[0] : materials;
  }

  initSpineData(spineId) {
    const atlas = new SpineRuntime.TextureAtlas(this.spineSetting[spineId].atlas);
    atlas.pages.forEach((page) => {
      const imageId = page.name.substr(0, page.name.indexOf("."));
      page.setTexture(new SpineRuntime.threejs.ThreeJsTexture(this.getImage(imageId)));
    });
    const skeleton = new SpineRuntime.SkeletonJson(new SpineRuntime.AtlasAttachmentLoader(atlas)).readSkeletonData(this.spineSetting[spineId].json);
    this.spines[spineId] = { skeleton };
  }

  getSpineData(spineId) {
    if (!this.spines[spineId]) {
      if (!this.spineSetting[spineId]) return undefined;
      this.initSpineData(spineId);
    }
    return this.spines[spineId];
  }

  createSpine(config, material, depthMaterial) {
    const spineData = this.getSpineData(config.id);
    if (!spineData) return new THREE.Object3D();
    const classId = config.classConfig?.id;
    const SpineConstructor = this.classSetting[classId] || SpineRuntime.threejs.SkeletonMesh;
    const spineObject = new SpineConstructor(
      spineData.skeleton,
      (parameters) => {
        parameters.defines = {};
        if (material) {
          parameters.fragmentShader = material.fragmentShader;
          parameters.vertexShader = material.vertexShader;
          parameters.depthTest = material.depthTest;
          parameters.depthWrite = material.depthWrite;
          parameters.depthFunc = material.depthFunc;
          parameters.side = material.side;
          parameters.blending = material.blending;
          parameters.blendDst = material.blendDst;
          parameters.blendDstAlpha = material.blendDstAlpha;
          parameters.blendEquation = material.blendEquation;
          parameters.blendEquationAlpha = material.blendEquationAlpha;
          parameters.blendSrc = material.blendSrc;
          parameters.blendSrcAlpha = material.blendSrcAlpha;
          parameters.lights = material.lights;
          parameters.wireframe = material.wireframe;
          parameters.glslVersion = material.glslVersion;
          Object.keys(material.uniforms).forEach((key) => {
            parameters.uniforms[key] = material.uniforms[key];
          });
          Object.keys(material.defines).forEach((key) => {
            parameters.defines[key] = material.defines[key];
          });
        }
        return parameters;
      },
      depthMaterial
        ? (parameters) => {
            parameters.defines = {};
            parameters.fragmentShader = depthMaterial.fragmentShader;
            parameters.vertexShader = depthMaterial.vertexShader;
            parameters.depthTest = depthMaterial.depthTest;
            parameters.depthWrite = depthMaterial.depthWrite;
            parameters.side = depthMaterial.side;
            parameters.transparent = parameters.transparent;
            parameters.glslVersion = depthMaterial.glslVersion;
            Object.keys(depthMaterial.uniforms).forEach((key) => {
              parameters.uniforms[key] = depthMaterial.uniforms[key];
            });
            Object.keys(depthMaterial.defines).forEach((key) => {
              parameters.defines[key] = depthMaterial.defines[key];
            });
            return parameters;
          }
        : null,
      config.maxVert,
    );
    spineObject.playerType = 3;
    spineObject.userData.spineId = config.id;
    if (material) spineObject.material = material;
    try {
      spineObject.state.setAnimation(0, config.defaultAnimation || spineObject.state.data.skeletonData.animations[0].name, !config.playOnce);
      if (config.skin) spineObject.skeleton.setSkinByName(config.skin);
      else if (spineObject.skeleton?.data?.skins.length > 1) {
        spineObject.skeleton.setSkin(spineObject.skeleton.data.skins[1]);
      }
    } catch (_error) {
      // allow an empty/default animation or skin configuration
    }
    if (config.trackOffset) {
      spineObject.state.tracks[0].trackTime += Math.random() * config.trackOffset;
    }
    if (config.timeScale) spineObject.state.timeScale = config.timeScale * this.devSpeed;
    spineObject.onTick = this.defaultAnimationSetting.SPINE.bind(spineObject);

    const listenerTypes = [
      { name: "event", event: "onEvent" },
      { name: "start", event: "onStart" },
      { name: "end", event: "onEnd" },
      { name: "dispose", event: "onDispose" },
      { name: "interrupted", event: "onInterrupted" },
      { name: "complete", event: "onComplete" },
    ];
    const removeListener = (name) => {
      spineObject.state.removeListener(spineObject.userData[`${name}Listener`]);
      spineObject.userData[`${name}Listener`] = null;
    };
    spineObject.playAnimation = (animation, options) => {
      const {
        mix = 0.3,
        speed = 1,
        loop = false,
        channel = 0,
        overwrite = true,
        onEvent = null,
        onStart = null,
        onEnd = null,
        onDispose = null,
        onInterrupted = null,
        onComplete = null,
      } = options || {};
      spineObject.state.data.defaultMix = mix;
      spineObject.state.timeScale = speed * this.devSpeed;
      spineObject.visible = true;
      let finalAnimation;
      if (Array.isArray(animation)) {
        animation.forEach((name, index) => {
          if (index === 0) spineObject.state.setAnimation(channel, name, false);
          else spineObject.state.addAnimation(channel, name, loop && index === animation.length - 1, 0);
          if (index === animation.length - 1) finalAnimation = name;
        });
      } else {
        finalAnimation = animation;
        spineObject.state.setAnimation(channel, animation, loop);
      }
      listenerTypes.forEach(({ name }) => {
        if (overwrite && spineObject.userData[`${name}Listener`]) removeListener(name);
      });
      if (onEvent) {
        spineObject.userData.eventListener = {
          event: (entry, event) => {
            removeListener("event");
            onEvent(entry, event);
          },
        };
        spineObject.state.addListener(spineObject.userData.eventListener);
      }
      if (onStart) {
        spineObject.userData.startListener = {
          start: (entry) => {
            removeListener("start");
            onStart(entry);
          },
        };
        spineObject.state.addListener(spineObject.userData.startListener);
      }
      if (onEnd) {
        spineObject.userData.endListener = { end: (entry) => onEnd(entry) };
        spineObject.state.addListener(spineObject.userData.endListener);
      }
      if (onDispose) {
        spineObject.userData.disposeListener = {
          dispose: (entry) => {
            removeListener("dispose");
            onDispose(entry);
          },
        };
        spineObject.state.addListener(spineObject.userData.disposeListener);
      }
      if (onInterrupted) {
        spineObject.userData.interruptedListener = {
          interrupted: (entry) => {
            removeListener("interrupted");
            onInterrupted(entry);
          },
        };
        spineObject.state.addListener(spineObject.userData.interruptedListener);
      }
      if (onComplete) {
        spineObject.userData.completeListener = {
          complete: (entry) => {
            if (entry.animation.name === finalAnimation) {
              removeListener("complete");
              onComplete(entry);
            }
          },
        };
        spineObject.state.addListener(spineObject.userData.completeListener);
      }
    };
    spineObject.update(0, this.uniformSetting.time.value);
    return spineObject;
  }

  createGeometry(geometryData) {
    const config = geometryData.config || {};
    switch (geometryData.type) {
      case 1:
        return this.getGeometry(geometryData.id);
      case 2: {
        const { width = 100, height = 100, widthSegments = 1, heightSegments = 1, cx = 0, cy = 0, cz = 0 } = config;
        return new THREE.PlaneBufferGeometry(width, height, widthSegments, heightSegments).translate(cx, cy, cz);
      }
      case 3: {
        const { width = 100, height = 100, depth = 100, widthSegments = 1, heightSegments = 1, depthSegments = 1 } = config;
        return new THREE.BoxBufferGeometry(width, height, depth, widthSegments, heightSegments, depthSegments);
      }
      case 4: {
        const { radius = 50, widthSegments = 12, heightSegments = 12 } = config;
        return new THREE.SphereBufferGeometry(radius, widthSegments, heightSegments);
      }
      case 5: {
        const { radius = 100, circleSegment = 20 } = config;
        return new THREE.CircleGeometry(radius, circleSegment);
      }
      case 6: {
        const shape = new THREE.Shape();
        const shapePoints = config.shapPointList === undefined ? [] : config.shapPointList;
        shapePoints.forEach((point, index) => {
          if (index === 0) shape.moveTo(point.x, point.y);
          else shape.lineTo(point.x, point.y);
        });
        return new THREE.ShapeGeometry(shape);
      }
      case 7: {
        const { radius = 30, length = 100, capSubdivisions = 4, radialSegments = 8 } = config;
        return new CapsuleGeometry(radius, length, capSubdivisions, radialSegments);
      }
      default:
        return null;
    }
  }

  createCamera(objectData) {
    const cameraData = objectData.camera || {};
    switch (cameraData.type) {
      case 1:
        return new THREE.PerspectiveCamera(cameraData.fov || 32, cameraData.aspect || 1, cameraData.near || 0.01, cameraData.far || 10000);
      case 2:
        return new THREE.OrthographicCamera(
          cameraData.left || -100,
          cameraData.right || 100,
          cameraData.top || 100,
          cameraData.bottom || -100,
          cameraData.near || 0.01,
          cameraData.far || 10000,
        );
      case 3:
        return new THREE.CubeCamera(
          cameraData.near || 0.01,
          cameraData.far || 10000,
          createCubeRenderTarget(this, cameraData.buffer, this.bufferSetting[cameraData.buffer]),
        );
      default:
        throw new Error(`unknown camera type:${cameraData.type}`);
    }
  }

  initScene(sceneData, scene) {
    scene.getPlayer = () => this;
    scene.playTimeline = (name, options) => this.playTimeline(scene, name, options);
    scene.stopTimeline = (name) => this.stopTimeline(scene, name);
    scene.getTimeline = (name, create) => this.getTimeline(scene, name, create);
    if (sceneData.hooksFunc?.render && this.animationSetting[sceneData.hooksFunc.render]) {
      scene.onBeforeRender = this.animationSetting[sceneData.hooksFunc.render].bind(scene);
    }
    sceneData.children.forEach((objectData) => this.initObject(objectData, scene, scene));
    scene.children.forEach((object) => this.finalizeObject(object));
    this.modifierObject(scene, sceneData);
    if (sceneData.hooksFunc?.init && this.animationSetting[sceneData.hooksFunc.init]) {
      this.animationSetting[sceneData.hooksFunc.init].apply(scene, [sceneData, this]);
    }
  }

  createObject(objectData, geometry, material, passMaterial) {
    let object;
    const classId = objectData.classConfig?.id;
    switch (objectData.type) {
      case 0: {
        const ObjectConstructor = this.classSetting[classId] || THREE.Object3D;
        object = new ObjectConstructor();
        break;
      }
      case 1: {
        const MeshConstructor = this.classSetting[classId] || THREE.Mesh;
        object = new MeshConstructor(geometry, material);
        ThreePlayer.buildMorph(object);
        break;
      }
      case 2: {
        const SkinnedMeshConstructor = this.classSetting[classId] || THREE.SkinnedMesh;
        object = new SkinnedMeshConstructor(geometry, material);
        ThreePlayer.buildMorph(object);
        break;
      }
      case 3:
        object = this.createSpine(
          { ...objectData.spine, classConfig: objectData.classConfig },
          material,
          objectData.setDepthMaterial === false ? null : passMaterial,
        );
        break;
      case 4: {
        const plugin = this.pluginSetting[objectData.pluginId];
        if (plugin) {
          try {
            object = plugin.call(this, objectData, material, objectData.userData.pluginData);
          } catch (_error) {
            object = undefined;
          }
        }
        object ||= new THREE.Object3D();
        break;
      }
      case 5:
        switch (objectData.light.type) {
          case 1:
            object = new THREE.AmbientLight(objectData.light.color, objectData.light.intensity);
            break;
          case 2:
            object = new THREE.DirectionalLight(objectData.light.color, objectData.light.intensity);
            break;
          case 3:
            object = new THREE.SpotLight(
              objectData.light.color,
              objectData.light.intensity,
              objectData.light.distance,
              objectData.light.angle,
              objectData.light.penumbra,
              objectData.light.decay,
            );
            break;
          case 4:
            object = new THREE.PointLight(objectData.light.color, objectData.light.intensity, objectData.light.distance, objectData.light.decay);
            break;
          default:
            throw new Error(`unknown light type:${objectData.light.type}`);
        }
        if (objectData.castShadow) {
          object.shadow.bias = objectData.light.bias;
          object.shadow.radius = objectData.light.radius;
          object.shadow.normalBias = objectData.light.normalBias;
          object.shadow.mapSize.fromArray(objectData.light.mapSize);
        }
        break;
      case 6:
        object = new THREE.Bone();
        break;
      case 7:
        object = this.createCamera(objectData);
        break;
      case 9:
        object = this.createText(objectData.text, material);
        break;
      default:
        object = new THREE.Object3D();
        break;
    }

    object.uuid = objectData.uuid;
    object.visible = objectData.visible;
    object.renderOrder = objectData.renderOrder;
    return object;
  }

  initObjectByID(exportId, parent, scene = parent, initializeChildren = true) {
    const objectData = this.exportResources[exportId];
    if (!objectData) return null;
    const object = this.initObject(objectData, parent, scene, initializeChildren);
    this.finalizeObject(object);
    return object;
  }

  initObject(objectData, parent, scene = parent, initializeChildren = true, existingObject) {
    const geometry = objectData.geometry ? this.createGeometry(objectData.geometry) : undefined;
    const material = objectData.material ? this.getMaterial(objectData.material, objectData.type, objectData.geometry) : undefined;
    const passMaterial = objectData.passMaterial ? this.getMaterial(objectData.passMaterial, objectData.type, objectData.geometry) : undefined;
    const object = existingObject || this.createObject(objectData, geometry, material, passMaterial);

    object.scene = scene;
    object.name = objectData.name;
    object.frustumCulled = objectData.frustumCulled === undefined || objectData.frustumCulled;
    object.castShadow = Boolean(objectData.castShadow);
    object.receiveShadow = Boolean(objectData.receiveShadow);
    if (objectData.material) object.userData.colorMaterial = material;
    if (passMaterial) {
      object.userData.passMaterial = passMaterial;
      if (objectData.setDepthMaterial !== false) object.customDepthMaterial = passMaterial;
    }
    if (objectData.position) object.position.fromArray(objectData.position);
    if (objectData.rotation) object.rotation.fromArray(objectData.rotation, "XYZ");
    if (objectData.scale) object.scale.fromArray(objectData.scale);
    object.userData.initPos = object.position.clone();
    object.userData.initRot = object.rotation.clone();
    object.userData.initScl = object.scale.clone();

    if (objectData.eventList) {
      objectData.eventList.forEach(({ key, funcName }) => {
        if (this.animationSetting[funcName]) {
          object.userData[key] = this.animationSetting[funcName].bind(object);
        }
        if ((key === "onRollOver" || key === "onRollOut") && !object.userData.onMouseMove) {
          object.userData.onMouseMove = () => {};
        }
      });
      scene.clicks ||= [];
      if (!scene.clicks.includes(object)) scene.clicks.push(object);
      object.userData.mouseEnabled = true;
    }
    if (objectData.userData) Object.assign(object.userData, objectData.userData);
    object.matrixAutoUpdate = objectData.autoMatrix !== undefined && objectData.autoMatrix;
    if (!object.matrixAutoUpdate) object.updateMatrix();

    if (objectData.hooksFunc?.render && this.animationSetting[objectData.hooksFunc.render]) {
      object.onBeforeRender = this.animationSetting[objectData.hooksFunc.render].bind(object);
    }
    if (objectData.children && initializeChildren) {
      objectData.children.forEach((childData) => this.initObject(childData, object, scene, true));
    }
    if (objectData.exportID) this.exportResources[objectData.exportID] = objectData;

    if (objectData.mask === 1) {
      object.onBeforeRender = this.defaultAnimationSetting.DRAW_MASK;
      object.onAfterRender = this.defaultAnimationSetting.BEGIN_MASK;
    } else if (objectData.mask === 2) {
      object.onBeforeRender = this.defaultAnimationSetting.DRAW_MASK;
      object.onAfterRender = this.defaultAnimationSetting.BEGIN_INVERT_MASK;
    } else if (objectData.mask === 3) {
      object.onAfterRender = this.defaultAnimationSetting.STOP_MASK;
    }

    parent?.add(object);
    if (objectData.type !== 3) {
      object.playTimeline = (name, options) => this.playTimeline(object, name, options);
      object.stopTimeline = (name) => this.stopTimeline(object, name);
      object.getTimeline = (name, create) => this.getTimeline(object, name, create);
      object.getTexture = this.getTexture.bind(this);
    }
    object.getPlayer = () => this;
    object.userData._initializeData = objectData;
    return object;
  }

  modifierObject(object, objectData) {
    objectData.modifier?.forEach(({ id, data }) => {
      this.modifierSetting[id]?.call(object, objectData, this, data);
    });
    objectData.machine?.forEach(({ id, data }) => {
      this.machineSetting[id]?.call(object, data);
    });
    if (objectData.classConfig && object.onInit) object.onInit();
  }

  finalizeObject(object) {
    if (object.userData._initializeData) {
      object.children.forEach((child) => this.finalizeObject(child));
      const objectData = object.userData._initializeData;
      if (objectData.type === 2) {
        try {
          object.bind(this.getSkeleton(objectData.skinning, object.parent), object.matrixWorld);
        } catch (error) {
          throw new Error(`no skinning:${objectData.skinning}`, error);
        }
      }
      this.modifierObject(object, objectData);
      if (objectData.hooksFunc?.init && this.animationSetting[objectData.hooksFunc.init]) {
        this.animationSetting[objectData.hooksFunc.init].call(object, objectData, this);
      }
      delete object.userData._initializeData;
    }
  }

  getGeometry(geometryId) {
    return this.geometries[geometryId] || null;
  }

  removeGeometry(geometryId) {
    this.geometries[geometryId]?.dispose();
    delete this.geometries[geometryId];
  }

  initGeometry(source) {
    if (!source.geometries) throw new Error("no geometries data");
    Object.keys(source.geometries).forEach((geometryId) => {
      if (!this.geometries[geometryId]) {
        this.geometries[geometryId] = ThreePlayer.buildGeometry(source.geometries[geometryId]);
      }
    });
    if (source.skinning) {
      Object.keys(source.skinning).forEach((skinningId) => {
        if (!this.skinning[skinningId]) this.skinning[skinningId] = source.skinning[skinningId];
      });
    }
  }

  getBone(boneName, object) {
    return object.getObjectByName(boneName) || (object.parent ? this.getBone(boneName, object.parent) : null);
  }

  getSkeleton(skinningId, object) {
    const skinning = this.skinning[skinningId];
    if (!skinning) throw new Error(`no skinning:${skinningId}`);
    const rootBone = this.getBone(skinning.bones[0].name, object);
    const skeletonId = `${skinningId}${rootBone.id}`;
    if (!this.skeletons[skeletonId]) {
      const bones = [];
      const boneInverses = [];
      skinning.bones.forEach((boneData, index) => {
        const bone = index === 0 ? rootBone : rootBone.getObjectByName(boneData.name) || rootBone.scene.getObjectByName(boneData.name);
        bones.push(bone);
        boneInverses.push(new THREE.Matrix4().fromArray(skinning.matrix[index]));
      });
      this.skeletons[skeletonId] = new THREE.Skeleton(bones, boneInverses);
    }
    return this.skeletons[skeletonId];
  }

  tick() {
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    if (now - this.clock.oldTime <= 10) return false;
    this.uniformSetting.delta.value = Math.min(this.clock.getDelta(), 0.03);
    this.uniformSetting.fps.value = this.uniformSetting.delta.value / 0.0167;
    this.uniformSetting.time.value = (this.uniformSetting.time.value + this.uniformSetting.delta.value) % 10000;
    return true;
  }

  compile(root, camera, renderTarget) {
    const renderables = [];
    const compileScene = new THREE.Scene();
    root.traverse((object) => {
      if (object.material && object.userData.initPos) {
        object.userData.visible = object.visible;
        object.userData.parent = object.parent;
        object.userData.frustumCulled = object.frustumCulled;
        object.visible = true;
        object.frustumCulled = false;
        renderables.push(object);
      }
    });
    renderables.forEach((object) => compileScene.add(object));
    const previousTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(renderTarget);
    this.renderer.render(compileScene, camera);
    this.renderer.setRenderTarget(previousTarget);
    renderables.forEach((object) => {
      object.frustumCulled = object.userData.frustumCulled;
      object.visible = object.userData.visible;
      object.userData.parent.add(object);
    });
    renderables.length = 0;
  }

  compileScene(sceneName) {
    const scene = this.getScene(sceneName);
    this.compile(scene, scene.camera, scene.buffer);
  }

  initTouch(options) {
    if (!this.mouseController) {
      this.mouseController = new Mouse.MouseController(this, options);
    }
    return this.mouseController;
  }

  disableTouch() {
    this.mouseController?.dispose();
    this.mouseController = null;
  }

  get domElement() {
    return this.renderer.domElement;
  }

  static buildGeometry(source) {
    const GeometryConstructor = geometryConstructors[source.type || 1];
    const geometry = new GeometryConstructor();

    Object.keys(source.attributes).forEach((attributeName) => {
      const sourceAttribute = source.attributes[attributeName];
      let attribute;
      if (sourceAttribute.type === 3) {
        attribute = new THREE.InterleavedBufferAttribute(
          new THREE.InterleavedBuffer(new Float32Array(sourceAttribute.array), sourceAttribute.stride),
          sourceAttribute.itemSize,
          sourceAttribute.offset,
        );
      } else {
        const AttributeConstructor = attributeConstructors[sourceAttribute.type];
        const ArrayConstructor = attributeName === "skinIndex" ? Uint16Array : Float32Array;
        attribute = new AttributeConstructor(new ArrayConstructor(sourceAttribute.array), sourceAttribute.itemSize);
      }
      geometry.setAttribute(attributeName, attribute);
    });

    if (source.groups) geometry.groups = source.groups;
    if (source.index) {
      const IndexArray = source.attributes.position.array.length > 196605 ? Uint32Array : Uint16Array;
      geometry.setIndex(new THREE.BufferAttribute(new IndexArray(source.index), 1));
    }
    if (!source.attributes.normal) geometry.computeVertexNormals();
    return geometry;
  }

  static updateGeometry(geometry, source) {
    const GeometryConstructor = geometryConstructors[source.type || 1];
    if (GeometryConstructor !== geometry.constructor) {
      geometry.dispose();
      return ThreePlayer.buildGeometry(source);
    }
    if (source.groups) geometry.groups = source.groups;
    Object.keys(source.attributes).forEach((attributeName) => {
      const sourceAttribute = source.attributes[attributeName];
      const current = geometry.attributes[attributeName];
      if (!current || sourceAttribute.type === 3) {
        let replacement;
        if (sourceAttribute.type === 3) {
          replacement = new THREE.InterleavedBufferAttribute(
            new THREE.InterleavedBuffer(new Float32Array(sourceAttribute.array), sourceAttribute.stride),
            sourceAttribute.itemSize,
            sourceAttribute.offset,
          );
        } else {
          const AttributeConstructor = attributeConstructors[sourceAttribute.type];
          const ArrayConstructor = attributeName === "skinIndex" ? Uint16Array : Float32Array;
          replacement = new AttributeConstructor(new ArrayConstructor(sourceAttribute.array), sourceAttribute.itemSize);
        }
        geometry.setAttribute(attributeName, replacement);
      } else {
        const ArrayConstructor = attributeName === "skinIndex" ? Uint16Array : Float32Array;
        current.array = new ArrayConstructor(sourceAttribute.array);
        current.itemSize = sourceAttribute.itemSize;
        current.count = sourceAttribute.array.length / sourceAttribute.itemSize;
        current.needsUpdate = true;
      }
    });
    if (source.index) {
      const IndexArray = source.attributes.position.array.length > 196605 ? Uint32Array : Uint16Array;
      geometry.index.array = new IndexArray(source.index);
      geometry.index.count = geometry.index.array.length;
      geometry.index.needsUpdate = true;
    }
    return geometry;
  }
}
