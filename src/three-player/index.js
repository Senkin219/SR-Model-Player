import { ThreePlayer } from "./engine/ThreePlayer.js";
import Browser from "./engine/device.js";
import Mouse from "./engine/mouse/index.js";
import { getCamera, cameraAdaptScreen, layoutToPosition } from "./engine/camera.js";
import { getSceneData } from "./engine/scene.js";
import BinaryDecoderModule from "./codec/BinaryModelDecoder.js";
import TimelineFactory from "./timeline/TimelineFactory.js";
import { createGradient, createGradientTexture } from "./timeline/gradient.js";
import SpineRuntime from "./runtime/spine/index.js";
import MSDFRuntime from "./runtime/msdf.js";
import AudioManager from "./audio/AudioManager.js";
import richText from "./rich-text/index.js";
import { tweenTo, tweenFromTo } from "./tween.js";

const utils = {
  createGradient,
  createGradientTexture,
  getCamera,
  cameraAdaptScreen,
  layoutToPosition,
  getSceneData,
  tweenTo,
  tweenFromTo,
};

const threePlayerCore = {
  THREEPlayer: ThreePlayer,
  spine: SpineRuntime,
  motion: TimelineFactory,
  msdf: MSDFRuntime,
  io: BinaryDecoderModule,
  mouse: Mouse,
  richText,
  utils,
  Browser,
  Audio: AudioManager,
};

export {
  ThreePlayer,
  ThreePlayer as THREEPlayer,
  SpineRuntime as spine,
  TimelineFactory as motion,
  MSDFRuntime as msdf,
  BinaryDecoderModule as io,
  Mouse as mouse,
  richText,
  utils,
  Browser,
  AudioManager as Audio,
};
export default threePlayerCore;
