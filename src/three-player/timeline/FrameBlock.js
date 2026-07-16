class FrameBlock {
  constructor(source) {
    const { start = 0, end = 1 } = source || {};
    this.start = start;
    this.end = end;
    this.duration = end - start;
  }
}

export default FrameBlock;
