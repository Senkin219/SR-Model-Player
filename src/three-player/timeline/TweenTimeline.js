import * as THREE from "three";
import AnimationUtils, { matrixMatch } from "./AnimationUtils.js";
import BaseTimeline from "./BaseTimeline.js";
import TweenBlock from "./TweenBlock.js";

class TweenTimeline extends BaseTimeline {
  constructor(source) {
    super(source);
    this.copy(source);
  }

  copy(source) {
    const { root = null, data = [], valueType = "f", clipStart = data[0].start, clipEnd = data[data.length - 1].end } = source || {};
    this.type = 3;
    this.valueType = valueType;
    this.data = data.map((block) => new TweenBlock(block));

    const path = AnimationUtils.parsePath(root, this.name);
    const object = path.object;
    const target = path.target;
    const property = path.prop;
    if (object) object.matrixAutoUpdate = object.matrixAutoUpdate || matrixMatch.includes(property);
    this.getObject = () => object;
    this.getValue = () => target[property];

    switch (valueType.charAt(0)) {
      case "a":
        this.getFrame = (frame) => {
          const block = this.getBlock(frame);
          if (block.duration === 0) return block.frames[0];
          const progress = block.easeFunc((frame - block.start) / block.duration);
          const start = block.frames[0];
          const end = block.frames[1];
          const value = [];
          start.forEach((_item, index) => {
            value[index] = start[index] + (end[index] - start[index]) * progress;
          });
          return value;
        };
        this.updateValue = (frame, weight) => {
          this.getFrame(frame).forEach((value, index) => {
            if (weight === 1) target[property][index] = value;
            else target[property][index] += (value - target[property][index]) * weight;
          });
        };
        break;
      case "f":
        this.getFrame = (frame) => {
          const block = this.getBlock(frame);
          if (block.duration === 0) return block.frames[0];
          const progress = block.easeFunc((frame - block.start) / block.duration);
          const start = block.frames[0];
          return start + (block.frames[1] - start) * progress;
        };
        this.updateValue = (frame, weight) => {
          if (weight === 1) target[property] = this.getFrame(frame);
          else target[property] += (this.getFrame(frame) - target[property]) * weight;
        };
        break;
      case "r": {
        const start = new THREE.Vector3();
        const end = new THREE.Vector3();
        const euler = new THREE.Euler(0, 0, 0, "XYZ");
        const quaternion = new THREE.Quaternion();
        this.getFrame = (frame) => {
          const block = this.getBlock(frame);
          if (block.duration === 0) {
            return euler.set(block.frames[0][0], block.frames[0][1], block.frames[0][2], "XYZ");
          }
          const progress = block.easeFunc((frame - block.start) / block.duration);
          start.fromArray(block.frames[0]);
          end.fromArray(block.frames[1]);
          start.lerp(end, progress);
          return euler.set(start.x, start.y, start.z, "XYZ");
        };
        this.updateValue = (frame, weight) => {
          if (target.quaternion && weight !== 1) {
            quaternion.setFromEuler(this.getFrame(frame));
            target.quaternion.slerp(quaternion, weight);
          } else {
            target[property].copy(this.getFrame(frame));
          }
        };
        break;
      }
      case "c": {
        const start = new THREE.Color();
        const end = new THREE.Color();
        this.getFrame = (frame) => {
          const block = this.getBlock(frame);
          if (block.duration === 0) return start.setHex(block.frames[0]);
          const progress = block.easeFunc((frame - block.start) / block.duration);
          start.setHex(block.frames[0]);
          end.setHex(block.frames[1]);
          return start.lerp(end, progress);
        };
        this.updateValue = (frame, weight) => {
          if (weight === 1) target[property].copy(this.getFrame(frame));
          else target[property].lerp(this.getFrame(frame), weight);
        };
        break;
      }
      case "v": {
        const ValueConstructor = AnimationUtils.getConstructor(valueType);
        if (!ValueConstructor) throw new Error(`type is incorrect:${valueType}`);
        const start = new ValueConstructor();
        const end = new ValueConstructor();
        this.getFrame = (frame) => {
          const block = this.getBlock(frame);
          if (block.duration === 0) return start.fromArray(block.frames[0]);
          const progress = block.easeFunc((frame - block.start) / block.duration);
          start.fromArray(block.frames[0]);
          end.fromArray(block.frames[1]);
          return start.lerp(end, progress);
        };
        this.updateValue = (frame, weight) => {
          if (weight === 1) target[property].copy(this.getFrame(frame));
          else target[property].lerp(this.getFrame(frame), weight);
        };
        break;
      }
      case "q": {
        const start = new THREE.Quaternion();
        const end = new THREE.Quaternion();
        this.getFrame = (frame) => {
          const block = this.getBlock(frame);
          if (block.duration === 0) return start.fromArray(block.frames[0]);
          const progress = block.easeFunc((frame - block.start) / block.duration);
          start.fromArray(block.frames[0]);
          end.fromArray(block.frames[1]);
          return start.slerp(end, progress);
        };
        this.updateValue = (frame, weight) => {
          if (weight === 1) target[property].copy(this.getFrame(frame));
          else target[property].slerp(this.getFrame(frame), weight);
        };
        break;
      }
      default:
        throw new Error(`type is incorrect:${valueType}`);
    }

    this.clipEnd = clipEnd;
    this.clipStart = clipStart;
  }

  getBlock(frame) {
    for (let index = this.data.length - 1; index > -1; index -= 1) {
      if (this.data[index].start <= frame) return this.data[index];
    }
    return this.data[0];
  }

  exportData() {
    const exported = [];
    let firstBlock = this.getBlock(this.clipStart);
    const firstIndex = this.data.indexOf(firstBlock);
    let lastBlock = this.getBlock(this.clipEnd);
    const lastIndex = this.data.indexOf(lastBlock);
    firstBlock = firstBlock.clone();
    lastBlock = lastIndex === firstIndex ? firstBlock : lastBlock.clone();
    lastBlock.start -= this.clipStart;
    firstBlock.end = firstBlock.end - this.clipStart + firstBlock.start + 1;
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
      if (this.duration && (this.loop || forceLoop)) localTime %= this.duration;
      if (localTime >= 0 && localTime <= this.duration) {
        this.percent = this.duration ? localTime / this.duration : 0;
        this.updateValue(localTime + this.clipStart, this.weight * mixWeight);
      } else if (this.percent !== 0 && localTime < 0) {
        this.percent = 0;
        this.updateValue(this.clipStart, this.weight * mixWeight);
      } else if (this.percent !== 1 && localTime > this.duration) {
        this.percent = 1;
        this.updateValue(this.clipEnd, this.weight * mixWeight);
      }
    }
  }

  clone() {
    return new TweenTimeline(this);
  }

  toJSON() {
    const result = {
      ...super.toJSON(),
      data: this.data.map((block) => block.toJSON()),
      clipStart: this.clipStart,
      clipEnd: this.clipEnd,
    };
    if (this.valueType !== undefined) result.valueType = this.valueType;
    return result;
  }

  get duration() {
    return this.clipEnd - this.clipStart;
  }

  get totalFrame() {
    return this.data[this.data.length - 1].end;
  }
}

export default TweenTimeline;
