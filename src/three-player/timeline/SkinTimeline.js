import TweenTimeline from "./TweenTimeline.js";
import SkinBlock from "./SkinBlock.js";

class SkinTimeline extends TweenTimeline {
  constructor(source) {
    super(source);
    this.copy(source);
  }

  copy(source) {
    const { root = null, data = [], clipStart = data[0].start, clipEnd = data[data.length - 1].end, resetSlot = true } = source || {};

    this.type = 6;
    this.data = data.map((block) => new SkinBlock(block));
    this.clipEnd = clipEnd;
    this.clipStart = clipStart;
    const spineObject = root.getObjectByName(this.name);
    this.resetSlot = resetSlot;
    this.render = (frame) => {
      const skinName = this.getFrame(frame);
      if (spineObject.skeleton.skin.name !== skinName) {
        try {
          spineObject.skeleton.setSkinByName(skinName);
          if (this.resetSlot) spineObject.skeleton.setSlotsToSetupPose();
        } catch (_error) {
          // ignore unavailable skins
        }
      }
    };
    this.getObject = () => spineObject;
    this.getValue = () => spineObject.skeleton.skin.name;
  }

  getFrame(frame) {
    return this.getBlock(frame).skin;
  }

  update(_previousTime, time, _mixWeight, forceLoop) {
    if (this.weight !== 0) {
      let localTime = time - this.start;
      if (this.duration && (this.loop || forceLoop)) localTime %= this.duration;
      if (localTime >= 0 && localTime <= this.duration) {
        this.percent = this.duration ? localTime / this.duration : 0;
        this.render(localTime + this.clipStart);
      } else if (this.percent !== 0 && localTime < 0) {
        this.percent = 0;
        this.render(this.clipStart);
      } else if (this.percent !== 1 && localTime > this.duration) {
        this.percent = 1;
        this.render(this.clipEnd);
      }
    }
  }

  clone() {
    return new SkinTimeline(this);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      data: this.data.map((block) => block.toJSON()),
      clipStart: this.clipStart,
      clipEnd: this.clipEnd,
      resetSlot: this.resetSlot,
    };
  }
}

export default SkinTimeline;
