import FrameBlock from "./FrameBlock.js";

class KeyframeBlock extends FrameBlock {
  constructor(source) {
    super(source);
    const { frames = [0, 1] } = source || {};
    this.frames = frames;
  }

  clone() {
    return new KeyframeBlock(this);
  }

  toJSON() {
    return { start: this.start, end: this.end, frames: this.frames };
  }
}

export default KeyframeBlock;
