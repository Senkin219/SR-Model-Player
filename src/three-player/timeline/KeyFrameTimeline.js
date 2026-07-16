import * as THREE from "three";
import AnimationUtils, { matrixMatch } from "./AnimationUtils.js";
import BaseTimeline from "./BaseTimeline.js";
import KeyframeBlock from "./KeyframeBlock.js";

class KeyFrameTimeline extends BaseTimeline {
  constructor(source) {
    super(source);
    this.copy(source);
  }

  copy(source) {
    const { root = null, data = [], valueType = "f", clipStart = 0, clipEnd = data[data.length - 1].end } = source || {};
    this.valueType = valueType;
    this.data = data.map((block) => new KeyframeBlock(block));

    const path = AnimationUtils.parsePath(root, this.name);
    const object = path.object;
    const target = path.target;
    const property = path.prop;
    object.matrixAutoUpdate = object.matrixAutoUpdate || matrixMatch.includes(property);
    this.getObject = () => object;
    this.getValue = () => target[property];

    switch (valueType.charAt(0)) {
      case "a":
        this.updateValue = (startFrame, endFrame, progress, weight) => {
          const start = this.getFrame(startFrame);
          const end = this.getFrame(endFrame);
          start.forEach((_value, index) => {
            const value = start[index] + (end[index] - start[index]) * progress;
            if (weight === 1) target[property][index] = value;
            else target[property][index] += (value - target[property][index]) * weight;
          });
        };
        break;
      case "f":
        this.updateValue = (startFrame, endFrame, progress, weight) => {
          const start = this.getFrame(startFrame);
          const value = start + (this.getFrame(endFrame) - start) * progress;
          if (weight === 1) target[property] = value;
          else target[property] += (value - target[property]) * weight;
        };
        break;
      case "c": {
        const startColor = new THREE.Color();
        const endColor = new THREE.Color();
        this.updateValue = (startFrame, endFrame, progress, weight) => {
          startColor.setHex(this.getFrame(startFrame));
          endColor.setHex(this.getFrame(endFrame));
          if (weight === 1) target[property].copy(startColor.lerp(endColor, progress));
          else target[property].lerp(startColor.lerp(endColor, progress), weight);
        };
        break;
      }
      case "v": {
        const ValueConstructor = AnimationUtils.getConstructor(valueType);
        if (!ValueConstructor) throw new Error(`type is incorrect:${valueType}`);
        const startValue = new ValueConstructor();
        const endValue = new ValueConstructor();
        this.initialize = AnimationUtils.initializeVector;
        this.updateValue = (startFrame, endFrame, progress, weight) => {
          startValue.fromArray(this.getFrame(startFrame));
          endValue.fromArray(this.getFrame(endFrame));
          if (weight === 1) target[property].copy(startValue.lerp(endValue, progress));
          else target[property].lerp(startValue.lerp(endValue, progress), weight);
        };
        break;
      }
      case "q": {
        const startQuaternion = new THREE.Quaternion();
        const endQuaternion = new THREE.Quaternion();
        this.updateValue = (startFrame, endFrame, progress, weight) => {
          startQuaternion.fromArray(this.getFrame(startFrame)).normalize();
          endQuaternion.fromArray(this.getFrame(endFrame)).normalize();
          if (weight === 1) {
            target[property].copy(startQuaternion.slerp(endQuaternion, progress));
          } else {
            target[property].slerp(startQuaternion.slerp(endQuaternion, progress), weight);
          }
        };
        break;
      }
      default:
        throw new Error(`type is incorrect:${valueType}`);
    }

    this.clipStart = clipStart;
    this.clipEnd = clipEnd;
  }

  getBlock(frame) {
    for (let index = this.data.length - 1; index > -1; index -= 1) {
      if (this.data[index].start <= frame) return this.data[index];
    }
    return this.data[0];
  }

  getFrame(frame) {
    const block = this.getBlock(frame);
    return block.frames[Math.min(block.frames.length - 1, frame - block.start)];
  }

  exportData() {
    const exported = [];
    let firstBlock = this.getBlock(this.clipStart);
    const firstIndex = this.data.indexOf(firstBlock);
    let lastBlock = this.getBlock(this.clipEnd);
    const lastIndex = this.data.indexOf(lastBlock);
    firstBlock = firstBlock.clone();
    lastBlock = lastIndex === firstIndex ? firstBlock : lastBlock.clone();
    lastBlock.frames = lastBlock.frames.filter((_frame, index) => index + lastBlock.start <= this.clipEnd);
    firstBlock.frames = firstBlock.frames.filter((_frame, index) =>
      index < firstBlock.frames.length - 1 ? index + firstBlock.start >= this.clipStart : firstBlock.end >= this.clipStart,
    );
    lastBlock.start -= this.clipStart;
    firstBlock.end = firstBlock.end - this.clipStart + firstBlock.start;
    firstBlock.start = 0;
    lastBlock.end = this.clipEnd - this.clipStart;
    exported.push(firstBlock);
    for (let index = firstIndex + 1; index < lastIndex; index += 1) {
      const block = this.data[index].clone();
      block.start = Math.max(0, block.start - this.clipStart);
      exported.push(block);
    }
    if (lastIndex !== firstIndex) exported.push(lastBlock);
    return exported;
  }

  update(_previousTime, time, mixWeight, forceLoop) {
    if (this.weight !== 0) {
      let localTime = time - this.start;
      if (this.loop || forceLoop) localTime %= this.duration;
      if (localTime >= 0 && localTime <= this.duration) {
        this.percent = localTime / this.duration;
        this.render(mixWeight);
      } else if (this.percent !== 0 && localTime < 0) {
        this.percent = 0;
        this.render(mixWeight);
      } else if (this.percent !== 1 && localTime > this.duration) {
        this.percent = 1;
        this.render(mixWeight);
      }
    }
  }

  render(mixWeight) {
    const frame = this.duration * this.percent + this.clipStart;
    const startFrame = Math.floor(frame);
    const endFrame = Math.ceil(frame);
    this.updateValue(startFrame, endFrame, frame - startFrame, this.weight * mixWeight);
  }

  clone() {
    return new KeyFrameTimeline(this);
  }

  toJSON(keepClipRange) {
    const data = keepClipRange ? this.data : this.exportData();
    return {
      ...super.toJSON(),
      valueType: this.valueType,
      data: data.map((block) => block.toJSON()),
      clipStart: keepClipRange ? this.clipStart : 0,
      clipEnd: keepClipRange ? this.clipEnd : this.clipEnd - this.clipStart,
    };
  }

  get duration() {
    return this.clipEnd - this.clipStart;
  }

  get totalFrame() {
    return this.data[this.data.length - 1].end;
  }
}

export default KeyFrameTimeline;
