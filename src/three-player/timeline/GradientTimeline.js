import AnimationUtils from "./AnimationUtils.js";
import TweenTimeline from "./TweenTimeline.js";
import GradientBlock from "./GradientBlock.js";

class GradientTimeline extends TweenTimeline {
  constructor(source) {
    super(source);
    this.copy(source);
  }

  copy(source) {
    const { root = null, data = [], valueType = "g", clipStart = data[0].start, clipEnd = data[data.length - 1].end } = source || {};

    this.type = 9;
    this.valueType = valueType;
    this.data = data.map((block) => new GradientBlock(block));
    const path = AnimationUtils.parsePath(root, this.name);
    const target = path.target;
    const object = path.object;
    const property = path.prop;
    const pixelData = target[property].image.data;
    this.getFrame = (frame) => {
      const block = this.getBlock(frame);
      if (block.duration === 0) return block.gradientValues[0];
      const progress = block.easeFunc((frame - block.start) / block.duration);
      const startGradient = block.gradientValues[0];
      const endGradient = block.gradientValues[1];
      const result = [];
      startGradient.forEach((_value, index) => {
        result[index] = startGradient[index] + (endGradient[index] - startGradient[index]) * progress;
      });
      return result;
    };
    this.updateValue = (frame, weight) => {
      this.getFrame(frame).forEach((value, index) => {
        if (weight === 1) pixelData[index] = value;
        else pixelData[index] += (value - pixelData[index]) * weight;
      });
      target[property].needsUpdate = true;
    };
    this.clipEnd = clipEnd;
    this.clipStart = clipStart;
    this.getObject = () => object;
    this.getValue = () => target[property];
  }

  clone() {
    return new GradientTimeline(this);
  }
}

export default GradientTimeline;
