import AnimationUtils from "./AnimationUtils.js";
import BaseTimeline from "./BaseTimeline.js";
import Cue from "./Cue.js";
import GroupTimeline from "./GroupTimeline.js";
import GradientBlock from "./GradientBlock.js";
import GradientTimeline from "./GradientTimeline.js";
import KeyframeBlock from "./KeyframeBlock.js";
import KeyFrameTimeline from "./KeyFrameTimeline.js";
import MovieTimeline from "./MovieTimeline.js";
import SkinBlock from "./SkinBlock.js";
import SkinTimeline from "./SkinTimeline.js";
import SpineBlock from "./SpineBlock.js";
import SpineTimeline from "./SpineTimeline.js";
import StepBlock from "./StepBlock.js";
import StepTimeline from "./StepTimeline.js";
import TextureTimeline from "./TextureTimeline.js";
import TweenBlock from "./TweenBlock.js";
import TweenTimeline from "./TweenTimeline.js";

export function createTimeline(source) {
  switch (source.type) {
    case 1:
      return new GroupTimeline(source);
    case 2:
      return new KeyFrameTimeline(source);
    case 3:
      return new TweenTimeline(source);
    case 4:
      return new SpineTimeline(source);
    case 5:
      return new StepTimeline(source);
    case 6:
      return new SkinTimeline(source);
    case 7:
      return new TextureTimeline(source);
    case 8:
      return new MovieTimeline(source);
    case 9:
      return new GradientTimeline(source);
    default:
      throw new Error(`unknown timeline type:${source.type}`);
  }
}

export function createBlock(source) {
  switch (source.type) {
    case 1:
      return new GroupTimeline(source);
    case 2:
      return new KeyframeBlock(source);
    case 3:
      return new TweenBlock(source);
    case 4:
      return new SpineBlock(source);
    case 5:
      return new StepBlock(source);
    case 6:
      return new SkinBlock(source);
    case 7:
      return new GradientBlock(source);
    default:
      throw new Error(`unknown block type:${source.type}`);
  }
}

export const TimelineFactory = {
  createTimeline,
  createBlock,
  BaseTimeline,
  GroupTimeline,
  KeyFrameTimeline,
  TweenTimeline,
  SpineTimeline,
  StepTimeline,
  SkinTimeline,
  TextureTimeline,
  MovieTimeline,
  GradientTimeline,
  Cue,
  KeyframeBlock,
  TweenBlock,
  SpineBlock,
  StepBlock,
  SkinBlock,
  GradientBlock,
  utils: AnimationUtils,
};

export {
  BaseTimeline,
  GroupTimeline,
  KeyFrameTimeline,
  KeyFrameTimeline as KeyframeTimeline,
  TweenTimeline,
  SpineTimeline,
  StepTimeline,
  SkinTimeline,
  TextureTimeline,
  MovieTimeline,
  GradientTimeline,
};

export default TimelineFactory;
