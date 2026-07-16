import * as THREE from "three";
import commonLayout from "./settings/common-layout.json";
import { decodeNestedJson } from "../three-player/codec/NestedJsonDecoder.js";
import { ThreePlayer } from "../three-player/index.js";
import BloomCompositePass from "./passes/BloomCompositePass.js";
import DepthEdgePass from "./passes/DepthEdgePass.js";
import FxaaPass from "./passes/FxaaPass.js";
import createAnimationSettings from "./settings/animations.js";
import modifierSettings from "./settings/modifiers/index.js";
import shaderSettings from "./settings/materials.js";
import pluginSettings from "./settings/plugins.js";
import uniformSettings from "./settings/uniforms.js";
import createOrbitControls from "./patches/OrbitControlsPatch.js";
import patchThreeInstancedBufferGeometry from "./patches/ThreeCompatibilityPatch.js";

patchThreeInstancedBufferGeometry();

const UI_LAYOUT = {
  width: 750,
  height: 750,
  type: "contain",
  scale: 1,
};

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

export class ModelPlayer {
  constructor(options = {}) {
    const {
      canvas,
      manifest,
      width = 100,
      height = 100,
      display = true,
      enableZoom = false,
      fixedBg = false,
      onProgress = () => {},
      onError = () => {},
      onReady = () => {},
      onRoleSpeak = () => {},
      onModelRotate = () => {},
    } = options;

    this.canvas = canvas;
    this.manifest = manifest;
    this.width = width;
    this.height = height;
    this.display = display;
    this.enableZoom = enableZoom;
    this.fixedBg = fixedBg;
    this.onProgress = onProgress;
    this.onError = onError;
    this.onReady = onReady;
    this.onRoleSpeak = onRoleSpeak;
    this.onModelRotate = onModelRotate;

    this.busy = false;
    this.buffers = [];
    this.sceneStatus = {};
    this.requestId = -1;
    this.currentWannaShowChara = "";
    this.sourceLoadMap = [];
    this.currentScene = "";
    this.needResize = true;
    this.pixelRatio = globalThis.devicePixelRatio || 1;
    this.disposed = false;

    this.sourceLoader = ThreePlayer.getSourceLoader();
    this.handleSpeakStart = () => {
      if (this.display && this.currentScene === this.currentWannaShowChara) {
        this.onRoleSpeak({ role: this.currentScene, type: "idle" });
      }
    };
  }

  async load() {
    Object.keys(this.manifest.avatar).forEach((role) => {
      this.sourceLoadMap[role] = {
        active: false,
        loaded: false,
        resolveFunc: null,
        rejectFunc: null,
      };
    });
    ThreePlayer.getEventDispatcher().addEventListener("speakStart", this.handleSpeakStart);

    try {
      await this.init3D();
      this.onReady(this);
      return this;
    } catch (error) {
      this.onError(error);
      this.dispose();
      return this;
    }
  }

  getCurrentScene() {
    return this.player.getScene(`avatar_${this.currentScene}`);
  }

  showChara(role) {
    return new Promise((resolve, reject) => {
      if (this.currentScene) this.getCurrentScene().visible = false;
      this.sourceLoadMap[role].active = true;
      this.sourceLoadMap[role].resolveFunc = resolve;
      this.sourceLoadMap[role].rejectFunc = reject;
      this.currentWannaShowChara = role;
      if (this.sourceLoadMap[role].loaded) {
        try {
          this.displayChara(role);
          resolve();
        } catch (error) {
          reject(error);
        }
      } else {
        this.loadActiveCharaSource();
      }
      this.depthPassMaterial.defines.HIDE_FLOWER = role === "acheron" ? 1 : 0;
    });
  }

  loadActiveCharaSource() {
    if (this.busy) return;
    let activeRole;
    Object.keys(this.sourceLoadMap).forEach((role) => {
      const { active, loaded } = this.sourceLoadMap[role];
      if (active && !loaded) activeRole = role;
    });
    if (!activeRole) return;

    this.busy = true;
    this.loadCharaManifest(activeRole)
      .then(() => {
        this.sourceLoadMap[activeRole].loaded = true;
        this.busy = false;
        if (this.currentWannaShowChara === activeRole) {
          try {
            this.displayChara(activeRole);
            this.sourceLoadMap[activeRole].resolveFunc();
          } catch (error) {
            this.sourceLoadMap[activeRole].rejectFunc(error);
          }
        }
        this.loadActiveCharaSource();
      })
      .catch((error) => {
        this.busy = false;
        this.sourceLoadMap[activeRole].rejectFunc(error);
        this.loadActiveCharaSource();
      });
  }

  addTimelineIdleCue(timelineSetting) {
    Object.keys(timelineSetting).forEach((name) => {
      if (name.indexOf("idle") !== -1) {
        timelineSetting[name].cues.push({ frame: 1, method: "speakStart" });
      }
    });
  }

  displayChara(role) {
    if (!this.sceneStatus[role]) {
      let timelineSetting = this.sourceLoader.getResult(`avatar_${role}_timeline`);
      const sceneSetting = decodeNestedJson(this.sourceLoader.getResult(`avatar_${role}_scene`));
      const { imgConfigData, layoutData } = sceneSetting;

      Object.assign(this.player.imageSetting, imgConfigData);
      this.player.initLayout({ geometries: {}, sceneList: [layoutData] });
      this.player.layoutData.sceneList.push(layoutData);
      timelineSetting = decodeNestedJson(timelineSetting);
      this.player.initGeometry(ThreePlayer.decode(this.sourceLoader.getResult(`avatar_${role}_model`)));
      this.addTimelineIdleCue(timelineSetting);
      Object.assign(this.player.timelineSetting, timelineSetting);
      this.sceneStatus[role] = true;
    }

    if (this.currentScene) this.player.stopTimeline(this.getCurrentScene());
    this.currentScene = role;
    this.playCharaTimeline("idle", true);
    this.getCurrentScene().show();
    this.getCurrentScene().visible = true;
    ThreePlayer.getEventDispatcher().dispatchEvent({ type: "changeRole", data: role });
    this.orbit.reset();
    const { desatura = 1 } = this.getCurrentScene().getObjectByName("AVATAR").userData;
    this.bloomCompositePass.setDesaturate(desatura);
    globalThis.scene = this.getCurrentScene();
  }

  playCharaTimeline(animation = "standby") {
    const role = this.currentScene;
    const repeat = animation === "standby" ? Math.floor(2 * Math.random() + 1) : 0;
    const mix = 0;

    if (this.player.timelineSetting[`${role}_idle`]) {
      this.player.playTimeline(this.getCurrentScene(), `${role}_${animation}`, {
        repeat,
        mix,
        onComplete: () => {
          this.playCharaTimeline(animation === "standby" ? "idle" : "standby");
        },
      });
    } else {
      this.player.playTimeline(this.getCurrentScene(), `${role}_standby`, {
        repeat,
        mix,
        onComplete: () => {
          this.playCharaTimeline("standby");
        },
      });
    }

    const avatar = this.getCurrentScene().getObjectByName("AVATAR");
    if (avatar.userData && avatar.userData.idle_other && !avatar.otherPlayed) {
      this.player.getTimeline(this.getCurrentScene(), avatar.userData.idle_other).play({
        repeat: -1,
      });
      avatar.otherPlayed = true;
    }
  }

  async init3D() {
    this.renderer = new THREE.WebGL1Renderer({
      canvas: this.canvas,
      alpha: true,
      premultipliedAlpha: false,
    });
    this.initRenderPlayer();
    await this.loadCommon();
    this.render();
  }

  loadCommon() {
    return new Promise((resolve, reject) => {
      this.sourceLoader.load(this.manifest.common);
      this.sourceLoader.setEventListener("progress", (progress) => {
        this.onProgress(progress);
      });
      this.sourceLoader.setEventListener("complete", () => {
        this.sourceLoader.removeEventListener("complete");
        resolve();
      });
      this.sourceLoader.setEventListener("error", (error) => {
        this.onError(error);
        reject(error);
      });
    });
  }

  loadCharaManifest(role) {
    return new Promise((resolve, reject) => {
      const { imgList, model, scene, timeline } = this.manifest.avatar[role];
      const resources = [...imgList, model, scene, timeline].filter((resource) => !this.sourceLoader.getResult(resource.id));
      if (resources.length === 0) {
        resolve();
        return;
      }
      this.sourceLoader.setEventListener("complete", () => {
        this.sourceLoader.removeEventListener("complete");
        resolve();
      });
      this.sourceLoader.setEventListener("error", (error) => {
        this.onError(error);
        reject(error);
      });
      this.sourceLoader.load(resources);
    });
  }

  initRenderPlayer() {
    this.renderer.setPixelRatio(1);
    if (this.fixedBg) this.renderer.setClearColor(new THREE.Color("#191919"), 1);
    this.renderer.autoClear = false;
    this.layoutData = cloneData(commonLayout);
    this.uniformSettings = uniformSettings;
    this.player = new ThreePlayer({
      layoutData: this.layoutData,
      renderer: this.renderer,
      animationSetting: createAnimationSettings(this),
      uniformSetting: this.uniformSettings,
      pluginSetting: pluginSettings,
      shaderSetting: shaderSettings,
      modifierSetting: modifierSettings,
    });
    globalThis.player = this.player;
    this.initEffect();
    this.initOrbit();
  }

  initEffect() {
    for (let index = 0; index < 4; index += 1) {
      this.buffers[index] = index > 2 ? new THREE.WebGLRenderTarget(1024, 1024, { format: THREE.RGBFormat }) : new THREE.WebGLRenderTarget(1, 1);
    }
    this.depthPassMaterial = this.player.getMaterial([
      {
        id: "DEPTH",
        side: THREE.DoubleSide,
      },
    ]);
    this.player.initBuffer("REF_BUFFER", this.buffers[3]);
    this.player.initBuffer("AVATAR_BUFFER", this.buffers[1]);
    this.player.initBuffer("OUTLINE_BUFFER", this.buffers[1]);
    this.player.initBuffer("DEPTH_BUFFER", this.buffers[2]);
    this.depthEdgePass = new DepthEdgePass(this.renderer, this.buffers[3]);
    this.bloomCompositePass = new BloomCompositePass(this.renderer, this.buffers[0]);
    this.fxaaPass = new FxaaPass(this.renderer, this.buffers[1]);
  }

  setOrbitRotate(forceRotate) {
    this.orbit.setForceRotate(forceRotate);
  }

  initOrbit() {
    const camera = this.player.getScene("scene_main").camera;
    camera.userData.initPos = camera.position.clone();
    this.orbit = createOrbitControls(camera, this.canvas, new THREE.Vector3(0, 85, 0), false);
    this.orbit.enableZoom = this.enableZoom;
    this.orbit.update();
    this.orbit.initRadius = this.orbit.getDistance();
    this.orbit.addEventListener("start", () => {
      this.onModelRotate(this.currentScene);
    });
    this.camera = camera.clone();
  }

  resize(width, height, pixelRatio = globalThis.devicePixelRatio || 1) {
    this.width = width;
    this.height = height;
    this.pixelRatio = pixelRatio;
    this.needResize = true;
  }

  onResize() {
    if (!this.renderer) return;
    const width = this.width * this.pixelRatio;
    const height = this.height * this.pixelRatio;
    const camera = this.player.getScene("scene_main").camera;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const size = this.player.resizeUI(width, height, UI_LAYOUT);
    for (let index = 0; index < 3; index += 1) {
      this.buffers[index].setSize(size.width, size.height);
    }
    this.bloomCompositePass.setResolution(size.width, size.height);
    this.depthEdgePass.setResolution(size.width, size.height);
  }

  drawAvatar(scene) {
    const ground = scene.getObjectByName("ground");
    const avatar = scene.getObjectByName("AVATAR");
    const particleScene = this.player.getScene("scene_particle");
    const camera = this.player.getScene("scene_main").camera;

    scene.autoUpdate = true;
    scene.scale.y = 1;
    this.renderer.shadowMap.enabled = false;
    ground.visible = false;
    avatar.children.forEach((object) => {
      if (object.isMesh) {
        if (object.userData.passMaterial && object.name !== "Weapon") {
          object.visible = !object.userData.disabled;
          if (!object.userData.depthPassMat) {
            object.userData.depthPassMat = this.depthPassMaterial.clone();
          }
          object.material = object.userData.depthPassMat;
        } else {
          object.visible = false;
        }
      }
      if (object.userData && object.userData.isHideRim) object.visible = false;
    });
    this.renderer.setRenderTarget(this.buffers[3]);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    this.depthEdgePass.render(this.buffers[1], true);

    scene.autoUpdate = false;
    scene.overrideMaterial = null;
    avatar.children.forEach((object) => {
      if (object.isMesh) {
        if (object.userData.depthMat) {
          object.visible = !object.userData.disabled;
          object.material = object.userData.depthMat;
        } else {
          object.visible = false;
        }
      }
      if (object.userData && object.userData.isHideRim) object.visible = true;
    });
    let clearColor = null;
    if (this.fixedBg) {
      clearColor = this.renderer.getClearColor(new THREE.Color());
      this.renderer.setClearColor(0, 0);
    }
    this.renderer.setRenderTarget(this.buffers[2]);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    if (this.fixedBg) this.renderer.setClearColor(clearColor, 1);

    scene.scale.y = -1;
    scene.updateMatrixWorld();
    avatar.children.forEach((object) => {
      if (object.isMesh) {
        if (object.userData.colorMaterial) {
          object.material = object.userData.colorMaterial;
          object.visible = !object.userData.disabled;
        } else {
          object.visible = false;
        }
      }
    });
    this.renderer.setRenderTarget(this.buffers[3]);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    this.player.drawBlur(this.buffers[3], this.buffers[3], { x: 2, y: 2 });

    this.renderer.setRenderTarget(this.buffers[0]);
    this.renderer.clear();
    this.renderer.render(particleScene, camera);
    scene.overrideMaterial = null;
    ground.visible = true;
    scene.scale.y = 1;
    scene.updateMatrixWorld();
    this.renderer.render(scene, camera);
    avatar.children.forEach((object) => {
      if (object.isMesh) {
        if (object.userData.passMaterial) {
          object.material = object.userData.passMaterial;
          object.visible = !object.userData.disabled;
        } else {
          object.visible = false;
        }
      }
    });
    this.renderer.render(scene, camera);
    this.bloomCompositePass.render(this.buffers[1]);
    this.fxaaPass.render(null);
  }

  render = () => {
    if (this.disposed) return;
    if (this.display) {
      if (this.needResize) {
        this.onResize();
        this.needResize = false;
      }
      if (this.display && this.player.tick() && this.currentScene !== "") {
        const scene = this.getCurrentScene();
        if (scene.visible) this.drawAvatar(scene);
        else {
          this.renderer.setRenderTarget(null);
          this.renderer.clear();
        }
      }
    }
    this.requestId = globalThis.requestAnimationFrame(this.render);
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    globalThis.cancelAnimationFrame(this.requestId);
    ThreePlayer.getEventDispatcher().removeEventListener("speakStart", this.handleSpeakStart);
    this.orbit?.dispose();
    this.sourceLoader.removeEventListener("error");
    this.sourceLoader.removeEventListener("complete");
    if (this.player) {
      Object.values(this.player.timelines).forEach((timeline) => timeline.stop?.());
      Object.values(this.player.geometries).forEach((geometry) => geometry.dispose());
      Object.values(this.player.textures).forEach((texture) => texture.dispose());
      Object.values(this.player.buffers).forEach((buffer) => buffer?.dispose?.());
      this.player.disableTouch();
      this.player.timelines = {};
      this.player.scenes = {};
    }
    this.buffers.forEach((buffer) => buffer.dispose());
    try {
      this.renderer?.forceContextLoss();
    } catch (_error) {}
    this.renderer?.dispose();
  }
}
