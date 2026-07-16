import TweenBlock from "./TweenBlock.js";
import { createGradient } from "./gradient.js";

class GradientBlock extends TweenBlock {
  constructor(source) {
    super(source);
    this.update();
  }

  update() {
    this.gradientValues = this.frames.map((gradient) => createGradient(gradient, 16));
  }

  clone() {
    return new GradientBlock(this);
  }
}

export default GradientBlock;
