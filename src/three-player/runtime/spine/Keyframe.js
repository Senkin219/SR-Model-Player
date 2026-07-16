import AnimationUtils from "../../timeline/AnimationUtils.js";

export class Keyframe {
  constructor(source) {
    const { ease = "linear", value = 1, start = 0 } = source || {};
    this.value = value;
    this.start = start;
    this.ease = ease;
  }

  get easeFunc() {
    return AnimationUtils.easeFunction(this.ease);
  }

  static getBlock(frames, time) {
    for (let index = frames.length - 1; index > 0; index -= 1) {
      if (frames[index].start >= time && frames[index - 1].start <= time) {
        return { end: frames[index], start: frames[index - 1] };
      }
    }
    return undefined;
  }
}

export default Keyframe;
