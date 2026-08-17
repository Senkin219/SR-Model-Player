<script setup>
import * as THREE from "three";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import CustomSelect from "../components/CustomSelect.vue";
import { ModelPlayer, ThreePlayer } from "../model-player/index.js";

const FORCE_INITIAL_IDLE_ROLES = new Set(["danhengil"]);

class ViewerModelPlayer extends ModelPlayer {
  playCharaTimeline(animation = "standby") {
    let nextAnimation = animation;
    if (animation === "idle" && this.forceInitialIdle) {
      this.forceInitialIdle = false;
    } else if (!this.hasIdleAnimation || (animation === "idle" && !this.idleEnabled)) {
      nextAnimation = "standby";
    }
    const timeline = super.playCharaTimeline(nextAnimation);
    applyTimelineState(this);
    return timeline;
  }
}

const DEFAULT_VIEW_SETTINGS = Object.freeze({
  minZoomDistance: 100,
  maxZoomDistance: 500,
  defaultPitch: 0,
  maxPitch: Math.PI / 2.4,
  verticalTargetOffset: 0,
});

const MODEL_VIEW_OVERRIDES = Object.freeze({
  "1.0/danheng": { verticalTargetOffset: -5 },
  "1.2/luka": { verticalTargetOffset: -5 },
  "1.3/danhengil": { verticalTargetOffset: -5 },
  "2.1/aventurine": { verticalTargetOffset: -5 },
});

const STORAGE_KEY = "model-player-settings";
const DEFAULT_BACKGROUND_COLOR = "#172033";
const BACKGROUND_PRESETS = Object.freeze(["#172033", "#071110", "#191919", "#2b2024", "#e8e2d8"]);

function normalizeBackgroundColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : DEFAULT_BACKGROUND_COLOR;
}

function readStoredSettings() {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || "{}");
  } catch (_error) {
    return {};
  }
}

const storedSettings = readStoredSettings();
const storedPlaybackSpeed = Number(storedSettings.playbackSpeed);

const viewport = ref(null);
const canvas = ref(null);
const canvasKey = ref(0);
const catalog = ref({ versions: [] });
const selectedVersion = ref(typeof storedSettings.selectedVersion === "string" ? storedSettings.selectedVersion : "");
const selectedRole = ref(typeof storedSettings.selectedRole === "string" ? storedSettings.selectedRole : "");
const panelOpen = ref(false);
const loading = ref(false);
const ready = ref(false);
const progress = ref(0);
const errorMessage = ref("");
const standbyEnabled = ref(typeof storedSettings.standbyEnabled === "boolean" ? storedSettings.standbyEnabled : true);
const paused = ref(typeof storedSettings.paused === "boolean" ? storedSettings.paused : false);
const panEnabled = ref(typeof storedSettings.panEnabled === "boolean" ? storedSettings.panEnabled : false);
const autoRotate = ref(typeof storedSettings.autoRotate === "boolean" ? storedSettings.autoRotate : false);
const backgroundColor = ref(normalizeBackgroundColor(storedSettings.backgroundColor));
const playbackSpeed = ref(Number.isFinite(storedPlaybackSpeed) ? THREE.MathUtils.clamp(storedPlaybackSpeed, 0.1, 2) : 1);

let modelPlayer = null;
let activeManifest = null;
let resizeObserver = null;
let loadSequence = 0;
let interactionRequestId = -1;

const currentVersion = computed(() => catalog.value.versions.find((version) => version.id === selectedVersion.value) || null);
const currentModels = computed(() => currentVersion.value?.models || []);
const currentModel = computed(() => currentModels.value.find((model) => model.id === selectedRole.value) || null);
const currentModelLabel = computed(() => currentModel.value?.name || "模型");
const versionOptions = computed(() =>
  catalog.value.versions.map((version) => ({
    value: version.id,
    label: version.label,
  })),
);
const roleOptions = computed(() =>
  currentModels.value.map((model) => ({
    value: model.id,
    label: model.name,
  })),
);
const idleAvailable = computed(() => currentModel.value?.hasIdle !== false);
const progressText = computed(() => `${Math.round(progress.value * 100)}%`);

function persistSettings() {
  try {
    globalThis.localStorage?.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedVersion: selectedVersion.value,
        selectedRole: selectedRole.value,
        standbyEnabled: standbyEnabled.value,
        paused: paused.value,
        panEnabled: panEnabled.value,
        autoRotate: autoRotate.value,
        playbackSpeed: Number(playbackSpeed.value),
        backgroundColor: backgroundColor.value,
      }),
    );
  } catch (_error) {}
}

function getViewSettings() {
  const key = `${selectedVersion.value}/${selectedRole.value}`;
  return {
    ...DEFAULT_VIEW_SETTINGS,
    ...(MODEL_VIEW_OVERRIDES[key] || {}),
  };
}

function resizePlayer() {
  if (!modelPlayer || !ready.value || !viewport.value) return;
  const { width, height } = viewport.value.getBoundingClientRect();
  modelPlayer.resize(width, height, Math.min(2, 1.1 * globalThis.devicePixelRatio));
}

function getManifestResources(manifest) {
  if (!manifest) return [];
  return [
    ...(manifest.common || []),
    ...Object.values(manifest.avatar || {}).flatMap((roleManifest) => [
      ...(roleManifest.imgList || []),
      roleManifest.model,
      roleManifest.scene,
      roleManifest.timeline,
    ]),
  ].filter(Boolean);
}

function clearManifestCache(manifest) {
  const loader = ThreePlayer.getSourceLoader();
  const resourceIds = new Set(getManifestResources(manifest).map((resource) => resource.id));
  resourceIds.forEach((id) => {
    const result = loader.result[id]?.result;
    if (typeof result?.src === "string" && result.src.startsWith("blob:")) {
      URL.revokeObjectURL(result.src);
    }
    delete loader.result[id];
    delete loader.sourcePool[id];
  });
}

function formatError(error) {
  if (Array.isArray(error)) {
    const ids = error.map((resource) => resource?.id).filter(Boolean);
    return ids.length ? `资源加载失败：${ids.join(", ")}` : "资源加载失败";
  }
  return error?.message || String(error || "未知错误");
}

function configureOrbit(player) {
  const orbit = player.orbit;
  if (!orbit) return;
  const settings = getViewSettings();
  orbit.enableRotate = true;
  orbit.enableZoom = true;
  orbit.minDistance = settings.minZoomDistance;
  orbit.maxDistance = settings.maxZoomDistance;
  orbit.minPolarAngle = Math.PI / 2 - settings.maxPitch;
  orbit.maxPolarAngle = Math.PI / 2 + settings.maxPitch;
  orbit.target.y += settings.verticalTargetOffset;
  const cameraOffset = orbit.object.position.clone().sub(orbit.target);
  const spherical = new THREE.Spherical().setFromVector3(cameraOffset);
  spherical.phi = THREE.MathUtils.clamp(Math.PI / 2 - settings.defaultPitch, orbit.minPolarAngle, orbit.maxPolarAngle);
  orbit.object.position.copy(orbit.target).add(cameraOffset.setFromSpherical(spherical));
  orbit.enablePan = panEnabled.value;
  orbit.update();
  orbit.saveState();
}

function getActiveTimelines(player) {
  const scene = player?.currentScene ? player.getCurrentScene() : null;
  const timelines = [scene?._playedTimeline];
  const avatar = scene?.getObjectByName("AVATAR");
  if (avatar?.otherPlayed && avatar.userData.idle_other) {
    timelines.push(player.player.getTimeline(scene, avatar.userData.idle_other));
  }
  return timelines.filter(Boolean);
}

function applyTimelineState(player = modelPlayer) {
  if (!player) return;
  getActiveTimelines(player).forEach((timeline) => {
    timeline.tween?.timeScale(Number(player.playbackSpeed ?? playbackSpeed.value));
    if (player.paused ?? paused.value) timeline.pause();
    else timeline.resume();
  });
}

function applyPlaybackSettings(player = modelPlayer) {
  if (!player) return;
  player.idleEnabled = standbyEnabled.value && idleAvailable.value;
  player.playbackSpeed = Number(playbackSpeed.value);
  player.paused = paused.value;
  applyTimelineState(player);
  player.orbit.enablePan = panEnabled.value;
  player.orbit.autoRotate = autoRotate.value;
  player.orbit.autoRotateSpeed = 1.25;
}

function updateOrbit() {
  modelPlayer?.orbit?.update();
  interactionRequestId = requestAnimationFrame(updateOrbit);
}

function hideRotationTip(player) {
  const tip = player.player.getScene("scene_particle").getObjectByName("tips");
  if (!tip) return;
  tip.visible = false;
  tip.show = () => {
    tip.visible = false;
  };
}

function disposeCurrentPlayer() {
  ready.value = false;
  modelPlayer?.dispose();
  modelPlayer = null;
  clearManifestCache(activeManifest);
  activeManifest = null;
}

async function fetchManifest(model) {
  const response = await fetch(model.manifest, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`无法读取模型清单（HTTP ${response.status}）`);
  }
  const manifest = await response.json();
  if (!manifest?.avatar?.[selectedRole.value]) {
    throw new Error("manifest 与当前角色不匹配");
  }
  return manifest;
}

async function loadSelectedModel() {
  const model = currentModel.value;
  if (!model || loading.value) return;
  if (model.hasIdle === false) standbyEnabled.value = false;

  const sequence = ++loadSequence;
  loading.value = true;
  progress.value = 0;
  errorMessage.value = "";

  try {
    const manifest = await fetchManifest(model);
    if (sequence !== loadSequence) return;

    disposeCurrentPlayer();
    clearManifestCache(manifest);
    canvasKey.value += 1;
    await nextTick();

    let isCharaLoading = false;
    let playerError = null;
    const player = new ViewerModelPlayer({
      canvas: canvas.value,
      manifest,
      enableZoom: true,
      onProgress: (value) => {
        if (sequence === loadSequence && isCharaLoading) progress.value = value;
      },
      onError: (error) => {
        playerError = error;
      },
    });
    player.hasIdleAnimation = model.hasIdle !== false;
    player.idleEnabled = standbyEnabled.value && player.hasIdleAnimation;
    player.forceInitialIdle = FORCE_INITIAL_IDLE_ROLES.has(selectedRole.value);
    modelPlayer = player;
    activeManifest = manifest;
    await player.load();

    if (sequence !== loadSequence) {
      player.dispose();
      return;
    }
    if (playerError || player.disposed) throw playerError || new Error("播放器初始化失败");

    isCharaLoading = true;
    await player.showChara(selectedRole.value);

    hideRotationTip(player);
    configureOrbit(player);
    ready.value = true;
    applyPlaybackSettings(player);
    resizePlayer();
  } catch (error) {
    if (sequence === loadSequence) errorMessage.value = formatError(error);
  } finally {
    if (sequence === loadSequence) loading.value = false;
  }
}

function selectFirstAvailableRole(preferredRole = "") {
  selectedRole.value = currentModels.value.some((model) => model.id === preferredRole) ? preferredRole : currentModels.value[0]?.id || "";
}

function handleVersionChange() {
  selectFirstAvailableRole();
  loadSelectedModel();
}

function handleRoleChange() {
  loadSelectedModel();
}

function resetModelPosition() {
  modelPlayer?.orbit?.reset();
}

function handleEscape(event) {
  if (event.key === "Escape") panelOpen.value = false;
}

watch(standbyEnabled, (value) => {
  if (modelPlayer) modelPlayer.idleEnabled = value && idleAvailable.value;
});
watch(paused, (value) => {
  if (!modelPlayer) return;
  modelPlayer.paused = value;
  applyTimelineState(modelPlayer);
});
watch(panEnabled, (value) => {
  if (modelPlayer?.orbit) modelPlayer.orbit.enablePan = value;
});
watch(autoRotate, (value) => {
  if (modelPlayer?.orbit) modelPlayer.orbit.autoRotate = value;
});
watch(playbackSpeed, (value) => {
  if (!modelPlayer) return;
  modelPlayer.playbackSpeed = Number(value);
  applyTimelineState(modelPlayer);
});
watch([selectedVersion, selectedRole, standbyEnabled, paused, panEnabled, autoRotate, playbackSpeed, backgroundColor], persistSettings, { flush: "sync" });

onMounted(async () => {
  resizeObserver = new ResizeObserver(resizePlayer);
  resizeObserver.observe(viewport.value);
  window.addEventListener("keydown", handleEscape);
  updateOrbit();

  try {
    const response = await fetch("/models/catalog.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    catalog.value = await response.json();
    const preferredRole = selectedRole.value;
    if (!catalog.value.versions.some((version) => version.id === selectedVersion.value)) {
      selectedVersion.value = catalog.value.versions[0]?.id || "";
    }
    selectFirstAvailableRole(preferredRole);
    await loadSelectedModel();
  } catch (error) {
    errorMessage.value = `无法读取模型目录：${formatError(error)}`;
  }
});

onBeforeUnmount(() => {
  loadSequence += 1;
  resizeObserver?.disconnect();
  window.removeEventListener("keydown", handleEscape);
  cancelAnimationFrame(interactionRequestId);
  disposeCurrentPlayer();
});
</script>

<template>
  <section ref="viewport" class="model-player" :style="{ '--player-background': backgroundColor }">
    <canvas :key="canvasKey" ref="canvas"></canvas>

    <button class="menu-button" type="button" @click="panelOpen = true"><span></span><span></span><span></span></button>

    <Transition name="fade">
      <button v-if="panelOpen" class="panel-backdrop" type="button" @click="panelOpen = false"></button>
    </Transition>

    <Transition name="panel">
      <aside v-if="panelOpen" id="player-controls" class="control-panel">
        <header class="panel-header">
          <div>
            <p>MODEL PLAYER</p>
            <h1>{{ currentModelLabel }}</h1>
          </div>
          <button type="button" @click="panelOpen = false">×</button>
        </header>

        <div class="control-field">
          <span>版本</span>
          <CustomSelect v-model="selectedVersion" :options="versionOptions" :disabled="loading" @change="handleVersionChange" />
        </div>

        <div class="control-field">
          <span>角色</span>
          <CustomSelect v-model="selectedRole" :options="roleOptions" :disabled="loading" @change="handleRoleChange" />
        </div>

        <div class="toggle-row" :class="{ disabled: !idleAvailable }">
          <span>待机动作</span>
          <label class="switch">
            <input v-model="standbyEnabled" type="checkbox" :disabled="!ready || loading || !idleAvailable" />
            <i></i>
          </label>
        </div>

        <div class="toggle-row">
          <span>暂停动作</span>
          <label class="switch">
            <input v-model="paused" type="checkbox" :disabled="!ready || loading" />
            <i></i>
          </label>
        </div>

        <div class="toggle-row">
          <span>平移模型</span>
          <label class="switch">
            <input v-model="panEnabled" type="checkbox" :disabled="!ready || loading" />
            <i></i>
          </label>
        </div>

        <div class="toggle-row">
          <span>自动旋转</span>
          <label class="switch">
            <input v-model="autoRotate" type="checkbox" :disabled="!ready || loading" />
            <i></i>
          </label>
        </div>

        <label class="speed-control">
          <span>
            <b>播放速度</b>
            <output>{{ Number(playbackSpeed).toFixed(1) }}×</output>
          </span>
          <input v-model="playbackSpeed" type="range" min="0.1" max="2" step="0.1" :disabled="!ready || loading" />
        </label>

        <div class="color-control">
          <span>
            <b>背景颜色</b>
            <output>{{ backgroundColor }}</output>
          </span>
          <div>
            <label class="color-picker">
              <input v-model="backgroundColor" type="color" />
              <i :style="{ backgroundColor }"></i>
            </label>
            <button
              v-for="color in BACKGROUND_PRESETS"
              :key="color"
              class="color-preset"
              :class="{ active: backgroundColor === color }"
              type="button"
              :style="{ backgroundColor: color }"
              @click="backgroundColor = color"
            ></button>
          </div>
        </div>

        <button class="reload-button" type="button" :disabled="!ready || loading" @click="resetModelPosition">重置模型位置</button>
      </aside>
    </Transition>

    <div v-if="loading && !ready" class="player-status">
      <i :style="{ '--progress': progressText }"></i>
      <span>正在加载 {{ currentModelLabel }}</span>
      <b>{{ progressText }}</b>
    </div>

    <div v-if="errorMessage" class="player-error" role="alert">
      <b>模型未加载</b>
      <span>{{ errorMessage }}</span>
    </div>
  </section>
</template>
