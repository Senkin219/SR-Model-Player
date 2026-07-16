import AnimationUtils from "./AnimationUtils.js";
import FrameBlock from "./FrameBlock.js";

class TweenBlock extends FrameBlock {
  constructor(source) {
    super(source);
    const { frames = [], ease = "" } = source || {};
    this.frames = frames;
    this.ease = ease;
    this.easeFunc = AnimationUtils.easeFunction(ease);
  }

  clone() {
    return new TweenBlock(this);
  }

  toJSON() {
    return {
      start: this.start,
      end: this.end,
      frames: this.frames,
      ease: this.ease,
    };
  }
}

export default TweenBlock;
