export class BaseTimeline {
  constructor(source) {
    const { type = 1, start = 0, end = 0, loop = false, weight = 1, name = "" } = source || {};
    this.type = type;
    this.start = start;
    this.end = end;
    this.name = name;
    this.loop = loop;
    this.weight = weight;
  }

  seek(time = this.time) {
    this.time = time;
    this.update(time, time, 1);
  }

  toJSON() {
    return {
      type: this.type,
      start: this.start,
      name: this.name,
      loop: this.loop,
    };
  }

  get rootClip() {
    let parent = this.parent;
    while (parent) {
      if (!parent.parent) return parent;
      parent = parent.parent;
    }
    return this;
  }

  get realStartTime() {
    let startTime = this.start;
    let parent = this.parent;
    while (parent) {
      startTime += parent.start;
      parent = parent.parent;
    }
    return startTime;
  }
}

export default BaseTimeline;
