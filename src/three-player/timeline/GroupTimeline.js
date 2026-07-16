import { gsap, Linear } from "gsap";
import { BaseTimeline } from "./BaseTimeline.js";
import { Cue } from "./Cue.js";
import TimelineFactory from "./TimelineFactory.js";

export class GroupTimeline extends BaseTimeline {
  constructor(source) {
    super(source);
    this.copy(source);
  }

  copy(source) {
    const { root = {}, clips = [], cues = [], methods = {} } = source || {};
    this.cues = cues.map((cue) => new Cue({ ...cue, root, methods }));
    this.clips = clips.map((clipSource) => {
      const clip = TimelineFactory.createTimeline({ ...clipSource, root, methods });
      clip.parent = this;
      return clip;
    });
    this.time = 0;
    this.tween = null;
    this.weight = 1;
    this.getObject = () => root;
  }

  traverse(visitor) {
    visitor(this);
    this.clips.forEach((clip) => {
      if (clip.type === 1) clip.traverse(visitor);
      else visitor(clip);
    });
  }

  list(name) {
    let matches = [];
    if (this.name === name) matches.push(this);
    this.clips.forEach((clip) => {
      if (clip.type === 1) matches = matches.concat(clip.list(name));
      else if (clip.name === name) matches.push(clip);
    });
    return matches;
  }

  add(clip) {
    clip.parent = this;
    this.clips.push(clip);
  }

  remove(clip) {
    this.clips = this.clips.filter((candidate) => candidate !== clip);
  }

  clone() {
    return new GroupTimeline(this);
  }

  toJSON(includeFullClip) {
    return {
      ...super.toJSON(),
      cues: this.cues.map((cue) => cue.toJSON(includeFullClip)),
      clips: this.clips.map((clip) => clip.toJSON(includeFullClip)),
    };
  }

  update(previousTime, time, mixWeight, forceLoop) {
    this.cues.forEach((cue) => cue.update(previousTime, time - this.start));
    if (this.weight !== 0) {
      Object.keys(this.clips)
        .map((key) => this.clips[key])
        .forEach((clip) => {
          try {
            clip.update(previousTime, time - this.start, mixWeight * this.weight, forceLoop || this.loop);
          } catch (_error) {
            // silently skip a failed child clip
          }
        });
    }
  }

  reset() {
    this.cues.forEach((cue) => cue.reset());
    Object.keys(this.clips)
      .map((key) => this.clips[key])
      .forEach((clip) => {
        if (clip.reset) clip.reset();
      });
  }

  pause() {
    if (this.tween) this.tween.pause();
  }

  resume() {
    if (this.tween) this.tween.resume();
  }

  stop() {
    if (this.tween) {
      this.tween.kill();
      this.tween = null;
    }
  }

  play(options) {
    const {
      loop = false,
      start = this.start,
      end = loop ? 999999 : this.duration,
      repeat = 0,
      delay = 0,
      repeatDelay = 0,
      ease = Linear.easeNone,
      speed = 1,
      fps = 30,
      onUpdate = null,
      onComplete = null,
    } = options || {};
    this.reset();
    this.tween = gsap.fromTo(
      this,
      { time: start },
      {
        duration: Math.abs(end - start) / fps / speed,
        time: end,
        onStart: this.seek.bind(this),
        onUpdate: onUpdate
          ? () => {
              this.seek();
              onUpdate();
            }
          : this.seek.bind(this),
        repeat,
        ease,
        delay,
        repeatDelay,
        onComplete,
      },
    );
    return this;
  }

  get duration() {
    let duration = 0;
    this.clips.forEach((clip) => {
      duration = Math.max(clip.duration + clip.start, duration);
    });
    return duration;
  }

  get totalFrame() {
    let totalFrame = 0;
    this.clips.forEach((clip) => {
      totalFrame = Math.max(clip.totalFrame, totalFrame);
    });
    return totalFrame;
  }

  get clipStart() {
    let clipStart = Number.MAX_VALUE;
    this.clips.forEach((clip) => {
      clipStart = Math.min(clip.clipStart, clipStart);
    });
    return clipStart;
  }

  set clipStart(value) {
    if (this.clips)
      this.clips.forEach((clip) => {
        clip.clipStart = value;
      });
  }

  get clipEnd() {
    let clipEnd = 0;
    this.clips.forEach((clip) => {
      clipEnd = Math.max(clip.clipEnd, clipEnd);
    });
    return clipEnd;
  }

  set clipEnd(value) {
    if (this.clips)
      this.clips.forEach((clip) => {
        clip.clipEnd = value;
      });
  }
}

export default GroupTimeline;
