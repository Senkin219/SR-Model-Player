import FrameBlock from "./FrameBlock.js";

class SpineBlock extends FrameBlock {
  constructor(source) {
    super(source);
    const { time = 0, animation = "", mix = 0, loop = true, sync = false } = source || {};
    this.time = time;
    this.animation = animation;
    this.mix = mix;
    this.loop = loop;
    this.sync = sync;
  }

  clone() {
    return new SpineBlock(this);
  }

  toJSON() {
    return {
      start: this.start,
      end: this.end,
      animation: this.animation,
      time: this.time,
      mix: this.mix,
      loop: this.loop,
      sync: this.sync,
    };
  }
}

export default SpineBlock;
