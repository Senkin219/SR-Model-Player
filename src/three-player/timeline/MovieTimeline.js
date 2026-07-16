import AnimationUtils from "./AnimationUtils.js";
import TweenTimeline from "./TweenTimeline.js";
import StepBlock from "./StepBlock.js";

class MovieTimeline extends TweenTimeline {
  constructor(source) {
    super(source);
    this.copy(source);
  }

  copy(source) {
    const { root = null, data = [], clipStart = data[0].start, clipEnd = data[data.length - 1].end } = source || {};

    this.type = 8;
    this.valueType = "str";
    this.data = data.map((block) => new StepBlock(block));
    const path = AnimationUtils.parsePath(root, this.name);
    const object = path.object;
    const target = path.target;
    const property = path.prop;
    this.getObject = () => object;
    this.getValue = () => target[property];
    this.updateValue = (frame, weight) => {
      const block = this.getBlock(frame);
      if (weight === 1) target[property] = block.value;
    };
    this.clipEnd = clipEnd;
    this.clipStart = clipStart;
  }

  getFrame(frame) {
    return this.getBlock(frame).value;
  }

  clone() {
    return new MovieTimeline(this);
  }
}

export default MovieTimeline;
