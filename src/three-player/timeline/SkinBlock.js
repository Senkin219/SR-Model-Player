import FrameBlock from "./FrameBlock.js";

class SkinBlock extends FrameBlock {
  constructor(source) {
    super(source);
    const { skin = "default" } = source || {};
    this.skin = skin;
  }

  clone() {
    return new SkinBlock(this);
  }

  toJSON() {
    return { start: this.start, end: this.end, skin: this.skin };
  }
}

export default SkinBlock;
