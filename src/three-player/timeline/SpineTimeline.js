import TweenTimeline from "./TweenTimeline.js";
import SpineBlock from "./SpineBlock.js";

class SpineTimeline extends TweenTimeline {
  constructor(source) {
    super(source);
    this.copy(source);
  }

  copy(source) {
    const { root = null, data = [], clipStart = data[0].start, clipEnd = data[data.length - 1].end, sync = false, track = 0 } = source || {};

    this.type = 4;
    this.data = data.map((block) => new SpineBlock(block));
    this.clipEnd = clipEnd;
    this.clipStart = clipStart;
    this.track = track;

    const spineObject = root.getObjectByName(this.name);
    this.sync = sync;
    if (!spineObject.userData.onTickModified) {
      const originalOnTick = spineObject.onTick;
      const timeline = this;
      spineObject.userData.onTickModified = true;
      spineObject.onTick = () => {
        if (!timeline.sync) originalOnTick();
      };
    }

    this.render = (previousTime, frame, forward) => {
      const block = this.getBlock(frame);
      const tracks = spineObject.state.tracks;
      let trackTime = ((frame - block.start) / 30) * spineObject.state.timeScale;
      const shouldSync = this.sync || block.sync;

      if (!tracks[this.track] || tracks[this.track].animation.name !== block.animation || tracks[this.track].loop !== block.loop) {
        spineObject.state.data.defaultMix = block.mix;
        spineObject.state.setAnimation(this.track, block.animation, block.loop);
        spineObject.state.tracks[this.track].trackTime = trackTime + block.time;
      }

      if (shouldSync) {
        spineObject.state.tracks[this.track].timeScale = 0;
        spineObject.state.tracks[this.track].trackTime = trackTime + block.time;
        if (!forward) trackTime = ((block.end - frame) / 30) * spineObject.state.timeScale;
        spineObject.state.tracks[this.track].mixTime = Math.min(trackTime, block.mix);
        if (this.sync) spineObject.update(0, previousTime / 30);
      } else {
        spineObject.state.tracks[this.track].timeScale = 1;
      }
    };
    this.getObject = () => spineObject;
    this.getValue = () => spineObject.state.tracks[this.track].animation.name;
  }

  getFrame(frame) {
    return this.getBlock(frame).animation;
  }

  update(previousTime, time, mixWeight, forceLoop) {
    if (this.weight !== 0) {
      let localTime = time - this.start;
      if (this.duration && (this.loop || forceLoop)) localTime %= this.duration;
      const previousPercent = this.percent;
      if (localTime >= 0 && localTime <= this.duration) {
        this.percent = this.duration ? localTime / this.duration : 0;
        this.render(previousTime, localTime + this.clipStart, this.percent >= previousPercent);
      } else if (this.percent !== 0 && localTime < 0) {
        this.percent = 0;
        this.render(previousTime, this.clipStart, this.percent >= previousPercent);
      } else if (this.percent !== 1 && localTime > this.duration) {
        this.percent = 1;
        this.render(previousTime, this.clipEnd, this.percent >= previousPercent);
      }
    }
  }

  clone() {
    return new SpineTimeline(this);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      data: this.data.map((block) => block.toJSON()),
      clipStart: this.clipStart,
      clipEnd: this.clipEnd,
      sync: this.sync,
      track: this.track,
    };
  }
}

export default SpineTimeline;
