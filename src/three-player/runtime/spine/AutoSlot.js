import Keyframe from "./Keyframe.js";
import { fromEntries } from "./utils.js";

export class SlotAnimation {
  constructor(source) {
    const { mode = 1, name = "", delay = 0 } = source || {};
    this.name = name;
    this.mode = mode;
    this.delay = delay;
  }
}

class BlinkSlotAnimation extends SlotAnimation {
  constructor(source) {
    super(source);
    const { blinkTime = 1, min = 0, max = 1 } = source || {};
    this.blinkTime = blinkTime;
    this.min = min;
    this.max = max;
  }
}

class TweenSlotAnimation extends SlotAnimation {
  constructor(source) {
    super(source);
    const { frames = [] } = source || {};
    this.frames = frames.map((frame) => new Keyframe(frame));
    this.framesEnd = this.frames[this.frames.length - 1].start;
  }
}

export class AutoSlot {
  constructor(source, spineObject) {
    const { animation = {}, slotName = "" } = source || {};
    this.animation = fromEntries(
      Object.keys(animation)
        .map((name) => [name, animation[name]])
        .map(([name, value]) => [name, AutoSlot.createAnimation(value)]),
    );
    this.spineObj = spineObject;
    this.slot = spineObject.skeleton.slots.find((slot) => slot.data.name === slotName);
  }

  static createAnimation(source) {
    switch (source.mode) {
      case 1:
        return new BlinkSlotAnimation(source);
      case 2:
        return new TweenSlotAnimation(source);
      default:
        return new SlotAnimation(source);
    }
  }

  render(time) {
    const animation = this.currentAnimation;
    if (animation.mode === 1) this.updateSineMode(animation, time);
    else if (animation.mode === 2) this.updateTweenMode(animation, time);
  }

  updateSineMode(animation, time) {
    this.slot.color.a =
      (0.5 + 0.5 * Math.sin(((time + animation.delay) * Math.PI * 2) / animation.blinkTime)) * (animation.max - animation.min) + animation.min;
  }

  updateTweenMode(animation, time) {
    if (animation.framesEnd !== 0) {
      const frameTime = (time + animation.delay + 1000) % animation.framesEnd;
      const block = Keyframe.getBlock(animation.frames, frameTime);
      const startValue = block.start.value;
      const startTime = block.start.start;
      const endValue = block.end.value;
      const endTime = block.end.start;
      this.slot.color.a = (endValue - startValue) * ((frameTime - startTime) / (endTime - startTime)) + startValue;
    }
  }

  get currentAnimation() {
    const animationName = this.spineObj.state.tracks[0].animation.name;
    return this.animation[animationName] || this.defaultAnimation;
  }

  get defaultAnimation() {
    return this.animation.default;
  }
}

export default AutoSlot;
