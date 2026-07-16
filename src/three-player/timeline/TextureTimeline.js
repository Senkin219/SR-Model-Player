import AnimationUtils from "./AnimationUtils.js";
import TweenTimeline from "./TweenTimeline.js";
import StepBlock from "./StepBlock.js";

class TextureTimeline extends TweenTimeline {
  constructor(source) {
    super(source);
    this.copy(source);
  }

  copy(source) {
    const { root = null, data = [], valueType = "t", clipStart = data[0].start, clipEnd = data[data.length - 1].end } = source || {};

    this.type = 7;
    this.valueType = valueType;
    this.data = data.map((block) => new StepBlock(block));
    const path = AnimationUtils.parsePath(root, this.name);
    const target = path.target;
    const object = path.object;
    const property = path.prop;
    this.updateValue = (frame) => {
      const block = this.getBlock(frame);
      target[property].value = object.getTexture(block.value);
    };
    this.clipEnd = clipEnd;
    this.clipStart = clipStart;
    this.getObject = () => object;
    this.getValue = () => target[property].value;
  }

  getFrame(frame) {
    return this.getBlock(frame).value;
  }

  clone() {
    return new TextureTimeline(this);
  }
}

export default TextureTimeline;
