import FrameBlock from "./FrameBlock.js";

class StepBlock extends FrameBlock {
  constructor(source) {
    super(source);
    const { value = 0 } = source || {};
    this.value = value;
  }

  clone() {
    return new StepBlock(this);
  }

  toJSON() {
    return { start: this.start, end: this.end, value: this.value };
  }
}

export default StepBlock;
