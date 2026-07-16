import * as THREE from "three";
import AnimationUtils from "./AnimationUtils.js";
import TweenTimeline from "./TweenTimeline.js";
import StepBlock from "./StepBlock.js";

class StepTimeline extends TweenTimeline {
  constructor(source) {
    super(source);
    this.copy(source);
  }

  copy(source) {
    const { root = null, data = [], valueType = "f", clipStart = data[0].start, clipEnd = data[data.length - 1].end } = source || {};
    this.type = 5;
    this.valueType = valueType;
    this.data = data.map((block) => new StepBlock(block));
    const path = AnimationUtils.parsePath(root, this.name);
    const object = path.object;
    const target = path.target;
    const property = path.prop;
    this.getObject = () => object;
    this.getValue = () => target[property];

    switch (valueType.charAt(0)) {
      case "a":
        this.updateValue = (frame, weight) => {
          this.getBlock(frame).value.forEach((value, index) => {
            if (weight === 1) target[property][index] = value;
            else target[property][index] += (value - target[property][index]) * weight;
          });
        };
        break;
      case "b":
      case "f":
        this.updateValue = (frame, weight) => {
          const block = this.getBlock(frame);
          if (weight === 1) target[property] = block.value;
          else target[property] += (block.value - target[property]) * weight;
        };
        break;
      case "c": {
        const color = new THREE.Color();
        this.updateValue = (frame, weight) => {
          const block = this.getBlock(frame);
          if (weight === 1) target[property].setHex(block.value);
          else target[property].lerp(color.setHex(block.value), weight);
        };
        break;
      }
      case "v": {
        const ValueConstructor = AnimationUtils.getConstructor(valueType);
        if (!ValueConstructor) throw new Error(`type is incorrect:${valueType}`);
        const vector = new ValueConstructor();
        this.updateValue = (frame, weight) => {
          const block = this.getBlock(frame);
          if (weight === 1) target[property].fromArray(block.value);
          else target[property].lerp(vector.fromArray(block.value), weight);
        };
        break;
      }
      case "q": {
        const quaternion = new THREE.Quaternion();
        this.updateValue = (frame, weight) => {
          const block = this.getBlock(frame);
          if (weight === 1) target[property].fromArray(block.value);
          else target[property].slerp(quaternion.fromArray(block.value), weight);
        };
        break;
      }
      default:
        throw new Error(`type is incorrect:${valueType}`);
    }
    this.clipEnd = clipEnd;
    this.clipStart = clipStart;
  }

  getFrame(frame) {
    return this.getBlock(frame).value;
  }

  clone() {
    return new StepTimeline(this);
  }
}

export default StepTimeline;
