import Keyframe from "./Keyframe.js";
import { fromEntries } from "./utils.js";

const RADIANS_TO_DEGREES = 180 / Math.PI;

export class BoneSpeedConfig {
  constructor(source) {
    const { timeScale = 1 } = source || {};
    this.timeScale = timeScale;
  }
}

class BoneAnimation {
  constructor(source) {
    const { mode = 1, name = "" } = source || {};
    this.mode = mode;
    this.name = name;
  }

  createHistory() {
    return null;
  }

  clone() {
    return AutoBone.createAnimation(this);
  }
}

class AnimationHistory {
  constructor() {
    this.current = null;
    this.previous = null;
    this.currentTrackName = "";
  }

  check(trackName, animation) {
    if (trackName !== this.currentTrackName) {
      this.previous = this.current;
      this.current = animation.createHistory();
      this.currentTrackName = trackName;
    }
  }
}

class FollowAnimation extends BoneAnimation {
  constructor(source) {
    super(source);
    this.copy(source);
  }

  copy(source) {
    const {
      delay = 0.1,
      speed = 0.1,
      spring = 0,
      affectByRange = 1,
      affectByX = 1,
      affectByY = 1,
      rotateMoveRange = 1,
      affectByLevel = 0,
      springLevel = 0,
      limitRange = 10,
    } = source || {};
    this.delay = delay;
    this.speed = speed;
    this.affectByRange = affectByRange;
    this.affectByX = affectByX;
    this.affectByY = affectByY;
    this.rotateMoveRange = rotateMoveRange;
    this.spring = spring;
    this.affectByLevel = affectByLevel;
    this.springLevel = springLevel;
    this.limitRange = limitRange;
  }

  createHistory() {
    return { speedX: 0, speedY: 0, buffer: [] };
  }
}

class SineAnimation extends BoneAnimation {
  constructor(source) {
    super(source);
    this.copy(source);
  }

  copy(source) {
    const {
      rotateOffset = 0,
      rotateTime = 2,
      rotateRange = 10,
      rotateCenter = 0,
      childOffset = 0.25,
      spring = 0,
      affectByLevel = 0.1,
      springLevel = 0,
      scaleYRange = 0,
      scaleYTime = 2,
      scaleYCenter = 0,
      scaleYOffset = 0,
      scaleYChildOffset = 0.25,
      scaleYSpring = 0,
      scaleYAffectByLevel = 0.1,
      scaleXRange = 0,
      scaleXTime = 2,
      scaleXCenter = 0,
      scaleXOffset = 0,
      scaleXChildOffset = 0.25,
      scaleXSpring = 0,
      scaleXAffectByLevel = 0.1,
      moveXRange = 0,
      moveXOffset = 0,
      moveXTime = 2,
      moveXChildOffset = 0.25,
      moveXSpring = 0,
      moveXAffectByLevel = 0.1,
      moveXCenter = 0,
      moveYRange = 0,
      moveYOffset = 0,
      moveYTime = 2,
      moveYChildOffset = 0.25,
      moveYSpring = 0,
      moveYAffectByLevel = 0.1,
      moveYCenter = moveXCenter,
    } = source || {};
    this.rotateOffset = rotateOffset;
    this.rotateCenter = rotateCenter;
    this.rotateTime = rotateTime;
    this.rotateRange = rotateRange;
    this.affectByLevel = affectByLevel;
    this.springLevel = springLevel;
    this.spring = spring;
    this.childOffset = childOffset;
    this.scaleYRange = scaleYRange;
    this.scaleYCenter = scaleYCenter;
    this.scaleYTime = scaleYTime;
    this.scaleYOffset = scaleYOffset;
    this.scaleYChildOffset = scaleYChildOffset;
    this.scaleYSpring = scaleYSpring;
    this.scaleYAffectByLevel = scaleYAffectByLevel;
    this.scaleXRange = scaleXRange;
    this.scaleXCenter = scaleXCenter;
    this.scaleXTime = scaleXTime;
    this.scaleXOffset = scaleXOffset;
    this.scaleXChildOffset = scaleXChildOffset;
    this.scaleXSpring = scaleXSpring;
    this.scaleXAffectByLevel = scaleXAffectByLevel;
    this.sinScaleXSameAsY =
      scaleXRange === scaleYRange &&
      scaleYCenter === scaleXCenter &&
      scaleXTime === scaleYTime &&
      scaleXOffset === scaleYOffset &&
      scaleXChildOffset === scaleYChildOffset &&
      scaleXSpring === scaleYSpring &&
      scaleXAffectByLevel === scaleYAffectByLevel;
    this.moveXRange = moveXRange;
    this.moveXTime = moveXTime;
    this.moveXSpring = moveXSpring;
    this.moveXChildOffset = moveXChildOffset;
    this.moveXAffectByLevel = moveXAffectByLevel;
    this.moveXOffset = moveXOffset;
    this.moveXCenter = moveXCenter;
    this.moveYRange = moveYRange;
    this.moveYTime = moveYTime;
    this.moveYSpring = moveYSpring;
    this.moveYChildOffset = moveYChildOffset;
    this.moveYAffectByLevel = moveYAffectByLevel;
    this.moveYOffset = moveYOffset;
    this.moveYCenter = moveYCenter;
  }
}

class WiggleAnimation extends BoneAnimation {
  constructor(source) {
    super(source);
    this.copy(source);
  }

  copy(source) {
    const {
      moveXFreq = 1,
      moveXAmp = 0,
      moveXOctaves = 0,
      moveXDelay = 0,
      moveXCenter = 0,
      moveXSeed = Math.floor(10000 * Math.random()),
      moveYFreq = moveXFreq,
      moveYAmp = moveXAmp,
      moveYOctaves = moveXOctaves,
      moveYDelay = moveXDelay,
      moveYCenter = moveXCenter,
      scaleXFreq = 1,
      scaleXAmp = 0,
      scaleXOctaves = 0,
      scaleXDelay = 0,
      scaleXCenter = 0,
      scaleYFreq = scaleXFreq,
      scaleYAmp = scaleXAmp,
      scaleYOctaves = scaleXOctaves,
      scaleYDelay = scaleXDelay,
      scaleYCenter = scaleXCenter,
      rotateSpeed = 0,
      rotateFreq = 1,
      rotateAmp = 0,
      rotateOctaves = 0,
      rotateDelay = 0,
      rotateCenter = 0,
      rotateFollowLimit = 0,
      rotateFollowSpeed = 0.1,
      rotateFollowFlip = 0,
      rotateFollowXMax = 20,
      rotateFollowYMax = 20,
    } = source || {};
    this.moveXFreq = moveXFreq;
    this.moveXAmp = moveXAmp;
    this.moveXOctaves = moveXOctaves;
    this.moveXDelay = moveXDelay;
    this.moveXCenter = moveXCenter;
    this.moveXSeed = moveXSeed;
    this.moveYFreq = moveYFreq;
    this.moveYAmp = moveYAmp;
    this.moveYOctaves = moveYOctaves;
    this.moveYDelay = moveYDelay;
    this.moveYCenter = moveYCenter;
    this.moveYSameAsX =
      moveXFreq === moveYFreq && moveXAmp === moveYAmp && moveXOctaves === moveYOctaves && moveXDelay === moveYDelay && moveXCenter === moveYCenter;
    this.scaleXFreq = scaleXFreq;
    this.scaleXAmp = scaleXAmp;
    this.scaleXOctaves = scaleXOctaves;
    this.scaleXDelay = scaleXDelay;
    this.scaleXCenter = scaleXCenter;
    this.scaleYFreq = scaleYFreq;
    this.scaleYAmp = scaleYAmp;
    this.scaleYOctaves = scaleYOctaves;
    this.scaleYDelay = scaleYDelay;
    this.scaleYCenter = scaleYCenter;
    this.scaleYSameAsX =
      scaleXFreq === scaleYFreq && scaleXAmp === scaleYAmp && scaleXOctaves === scaleYOctaves && scaleXDelay === scaleYDelay && scaleXCenter === scaleYCenter;
    this.rotateSpeed = rotateSpeed;
    this.rotateFreq = rotateFreq;
    this.rotateAmp = rotateAmp;
    this.rotateOctaves = rotateOctaves;
    this.rotateDelay = rotateDelay;
    this.rotateCenter = rotateCenter;
    this.rotateFollowEnable = rotateFollowLimit !== 0;
    this.rotateFollowLimit = rotateFollowLimit;
    this.rotateFollowSpeed = rotateFollowSpeed;
    this.rotateFollowFlip = rotateFollowFlip;
    this.rotateFollowXMax = rotateFollowXMax;
    this.rotateFollowYMax = rotateFollowYMax;
  }
}

class SpringAnimation extends BoneAnimation {
  constructor(source) {
    super(source);
    this.copy(source);
  }

  copy(source) {
    const {
      delay = 0.1,
      speed = 0.1,
      spring = 0,
      springRot = 0,
      affectByLevel = 0,
      springLevel = 0,
      limitRange = 80,
      rotateOffset = 0,
      friction = 0.7,
      springUseTarget = false,
      windX = 0,
      windY = 0,
      windFreq = 1,
      windOctaves = 0,
      windAccel = 1,
      windDelay = 0,
      gravityX = 0,
      gravityY = 0,
    } = source || {};
    this.delay = delay;
    this.speed = speed;
    this.spring = spring;
    this.springRot = springRot;
    this.affectByLevel = affectByLevel;
    this.springLevel = springLevel;
    this.limitRange = limitRange;
    this.rotateOffset = rotateOffset;
    this.friction = friction;
    this.springUseTarget = springUseTarget;
    this.windX = windX;
    this.windY = windY;
    this.windFreq = windFreq;
    this.windAccel = windAccel;
    this.windDelay = windDelay;
    this.windOctaves = windOctaves;
    this.gravityX = gravityX;
    this.gravityY = gravityY;
    this.hasWindForce = windX || windY;
  }
}

class ElasticAnimation extends BoneAnimation {
  constructor(source) {
    super(source);
    this.copy(source);
  }

  copy(source) {
    const {
      elasticSpring = 0.4,
      elasticFriction = 0.6,
      elasticSoftness = 1,
      elasticSpringY = elasticSpring,
      elasticFrictionY = elasticFriction,
      elasticSoftnessY = elasticSoftness,
    } = source || {};
    this.elasticSpring = elasticSpring;
    this.elasticFriction = elasticFriction;
    this.elasticSoftness = elasticSoftness;
    this.elasticSpringY = elasticSpringY;
    this.elasticFrictionY = elasticFrictionY;
    this.elasticSoftnessY = elasticSoftnessY;
  }
}

class KeyframeAnimation extends BoneAnimation {
  constructor(source) {
    super(source);
    this.copy(source);
  }

  copy(source) {
    const { delay = 0, xFrames = [], yFrames = [], sxFrames = [], syFrames = [] } = source || {};
    this.delay = delay;
    this.xFrames = xFrames.map((frame) => new Keyframe(frame));
    this.xFramesEnd = this.xFrames.length ? this.xFrames[this.xFrames.length - 1].start : 0;
    this.yFrames = yFrames.map((frame) => new Keyframe(frame));
    this.yFramesEnd = this.yFrames.length ? this.yFrames[this.yFrames.length - 1].start : 0;
    this.sxFrames = sxFrames.map((frame) => new Keyframe(frame));
    this.sxFramesEnd = this.sxFrames.length ? this.sxFrames[this.sxFrames.length - 1].start : 0;
    this.sYSameAsSX = syFrames.length === 0;
    if (this.sYSameAsSX) {
      this.syFrames = [];
      this.syFramesEnd = 0;
    } else {
      this.syFrames = syFrames.map((frame) => new Keyframe(frame));
      this.syFramesEnd = this.syFrames.length ? this.syFrames[this.syFrames.length - 1].start : 0;
    }
  }
}

export class AutoBone {
  constructor(source, spineObject) {
    const { animation = {}, rootBoneName = "", endBoneName = [], targetBoneName = "", targetEndBoneName = "", targetWeight = 1 } = source || {};
    this.animation = fromEntries(
      Object.keys(animation)
        .map((name) => [name, animation[name]])
        .map(([name, value]) => [name, AutoBone.createAnimation(value)]),
    );
    this.rootMovement = 0;
    this.rootBoneName = rootBoneName;
    this.endBoneName = Array.isArray(endBoneName) ? endBoneName : [endBoneName].filter((boneName) => boneName !== "");
    this.targetBoneName = targetBoneName;
    this.targetEndBoneName = targetEndBoneName;
    this.targetWeight = targetWeight;
    this.history = new AnimationHistory();
    this.bind(spineObject);
  }

  static createAnimation(source) {
    switch (source.mode) {
      case 1:
        return new SineAnimation(source);
      case 2:
        return new FollowAnimation(source);
      case 3:
        return new WiggleAnimation(source);
      case 4:
        return new SpringAnimation(source);
      case 5:
        return new ElasticAnimation(source);
      case 6:
        return new KeyframeAnimation(source);
      default:
        return new BoneAnimation(source);
    }
  }

  bind(spineObject) {
    this.spineObj = spineObject;
    this.rootBone = spineObject.skeleton.findBone(this.rootBoneName);
    if (this.targetBoneName !== "") {
      this.targetBone = spineObject.skeleton.findBone(this.targetBoneName);
    }
    this.init(this.rootBone);
  }

  init(bone, level = 0) {
    bone.initX = bone.x;
    bone.initY = bone.y;
    bone.initWorldX = bone.worldX;
    bone.initWorldY = bone.worldY;
    bone.initScaleX = bone.scaleX;
    bone.initScaleY = bone.scaleY;
    bone.initRotation = bone.rotation;
    bone.autoMovePrevWorldX = bone.worldX;
    bone.autoMovePrevWorldY = bone.worldY;
    bone.autoMoveSpeedX = 0;
    bone.autoMoveSpeedY = 0;
    bone.autoMoveFriction = 0;
    bone.followRotation = 0;
    bone.elasticSpeedX = 0;
    bone.elasticSpeedY = 0;
    bone.children.forEach((child) => this.init(child, level + 1));
    if (bone.children.length === 0) {
      bone.tailAutoMovePrevWorldX = bone.y * bone.b + bone.worldX;
      bone.tailAutoMovePrevWorldY = bone.y * bone.d + bone.worldY;
    }
  }

  reset() {
    this.rootMovement = 0;
    this.resetBone();
  }

  resetBone(bone = this.rootBone) {
    bone.worldX = bone.initWorldX;
    bone.worldY = bone.initWorldY;
    bone.scaleX = bone.initScaleX;
    bone.scaleY = bone.initScaleY;
    bone.rotation = bone.initRotation;
    if (!this.endBoneName.includes(bone.name)) {
      bone.children.forEach((child) => this.resetBone(child));
    }
  }

  render(deltaScale, time, mix, mixingFromName) {
    let previousAnimation = null;
    const animation = this.currentAnimation;
    const trackName = this.currentTrackName;
    let weight = 1;
    if (!this.history.current) this.history.check(this.currentTrackName, animation);
    if (mixingFromName && trackName !== mixingFromName) {
      previousAnimation = this.animation[mixingFromName] || this.defaultAnimation;
      this.history.check(this.currentTrackName, animation);
    }
    if (previousAnimation && mix !== 1) {
      weight = mix;
      this.renderAutoBone(previousAnimation, this.history.previous, deltaScale, time, 1);
    }
    this.renderAutoBone(animation, this.history.current, deltaScale, time, weight);
  }

  renderAutoBone(animation, history, deltaScale, time, weight) {
    switch (animation.mode) {
      case 1:
        this.updateSineMode(animation, time, this.rootBone, this.targetBone, 0, weight);
        break;
      case 2:
        this.updatePhysicMode(animation, history, this.rootBone, time, deltaScale, weight);
        break;
      case 3: {
        let value =
          animation.moveXAmp === 0
            ? 0
            : this.updateWiggleMode(animation.moveXFreq, animation.moveXAmp, animation.moveXOctaves, time, animation.moveXDelay) + animation.moveXCenter;
        this.rootBone.x = this.mixValue(this.rootBone.x, this.rootBone.initX + value, weight);
        if (animation.moveYSameAsX) {
          value =
            animation.moveXAmp === 0
              ? 0
              : this.updateWiggleMode(animation.moveXFreq, animation.moveXAmp, animation.moveXOctaves, time, animation.moveXDelay + animation.moveXSeed) +
                animation.moveXCenter;
        } else {
          value =
            animation.moveYAmp === 0
              ? 0
              : this.updateWiggleMode(animation.moveYFreq, animation.moveYAmp, animation.moveYOctaves, time, animation.moveYDelay) + animation.moveYCenter;
        }
        this.rootBone.y = this.mixValue(this.rootBone.y, this.rootBone.initY + value, weight);

        value =
          animation.scaleXAmp === 0
            ? 0
            : this.updateWiggleMode(animation.scaleXFreq, animation.scaleXAmp, animation.scaleXOctaves, time, animation.scaleXDelay) + animation.scaleXCenter;
        this.rootBone.scaleX = this.mixValue(this.rootBone.scaleX, this.rootBone.initScaleX + value, weight);
        if (animation.scaleYSameAsX) {
          this.rootBone.scaleY = this.mixValue(this.rootBone.scaleY, this.rootBone.initScaleY + value, weight);
        } else {
          value =
            animation.scaleYAmp === 0
              ? 0
              : this.updateWiggleMode(animation.scaleYFreq, animation.scaleYAmp, animation.scaleYOctaves, time, animation.scaleYDelay) + animation.scaleYCenter;
          this.rootBone.scaleY = this.mixValue(this.rootBone.scaleY, this.rootBone.initScaleY + value, weight);
        }

        let rotation = this.rootBone.initRotation + time * animation.rotateSpeed * 360 + animation.rotateCenter;
        rotation +=
          animation.rotateAmp === 0
            ? 0
            : this.updateWiggleMode(animation.rotateFreq, animation.rotateAmp, animation.rotateOctaves, time, animation.rotateDelay);
        if (animation.rotateFollowEnable) {
          const moveX = this.rootBone.worldX - this.rootBone.autoMovePrevWorldX;
          const moveY = this.rootBone.worldY - this.rootBone.autoMovePrevWorldY;
          let targetRotation =
            animation.rotateFollowFlip === 1
              ? -animation.rotateFollowLimit * Math.max(-1, Math.min(1, moveX / animation.rotateFollowXMax)) -
                animation.rotateFollowLimit * Math.max(-1, Math.min(1, moveY / animation.rotateFollowYMax))
              : (Math.atan2(moveY, moveX) * RADIANS_TO_DEGREES + 360) % 360;
          const difference = targetRotation - this.rootBone.followRotation;
          if (difference >= 180) targetRotation -= 360;
          else if (difference <= -180) targetRotation += 360;
          this.rootBone.followRotation +=
            Math.min(animation.rotateFollowLimit, Math.max(-animation.rotateFollowLimit, targetRotation - this.rootBone.followRotation)) *
            animation.rotateFollowSpeed;
          this.rootBone.followRotation = (this.rootBone.followRotation + 360) % 360;
          if (animation.rotateFollowFlip === 2 && Math.abs(this.rootBone.followRotation - 180) < 90) {
            this.rootBone.scaleY *= -1;
          }
          rotation += this.rootBone.followRotation;
        }
        this.rootBone.autoMovePrevWorldX = this.rootBone.worldX;
        this.rootBone.autoMovePrevWorldY = this.rootBone.worldY;
        this.rootBone.rotation = this.mixValue(this.rootBone.rotation, rotation, weight);
        break;
      }
      case 4: {
        const worldScale = this.rootBone.getWorldScale();
        animation.forceX = -animation.gravityX;
        animation.forceY = -animation.gravityY;
        if (animation.hasWindForce) {
          const windForce = 0.5 + 0.5 * this.updateWiggleMode(1 / animation.windFreq, 1, animation.windOctaves, time, animation.windDelay, 0.8);
          animation.forceX += animation.windX * windForce;
          animation.forceY += animation.windY * windForce;
        }
        this.updateSpringMagic(animation, this.rootBone, this.targetBone, time, deltaScale, 0, weight, worldScale.x * worldScale.y < 0 ? -1 : 1);
        break;
      }
      case 5:
        this.updateElasic(animation, this.rootBone, deltaScale, weight);
        break;
      case 6:
        this.updateKeyFrameMode(animation, this.rootBone, time, weight);
        break;
      default:
        break;
    }
  }

  getHistoryRotate(time, buffer) {
    for (let index = buffer.length - 1; index > -1; index -= 1) {
      const next = buffer[index];
      if (next.time > time) {
        for (let previousIndex = index - 1; previousIndex > -1; previousIndex -= 1) {
          const previous = buffer[previousIndex];
          if (time >= previous.time) {
            return previous.delta + ((next.delta - previous.delta) * (time - previous.time)) / (next.time - previous.time);
          }
        }
        return 0;
      }
    }
    return 0;
  }

  mixValue(current, target, weight) {
    return current + (target - current) * weight;
  }

  updateSineMode(animation, time, bone = this.rootBone, targetBone = this.targetBone, level = 0, weight) {
    if (this.endBoneName.includes(bone.data.name)) return;

    const useTarget = targetBone && targetBone.data.name !== this.targetEndBoneName;
    const initialRotation = useTarget ? this.mixValue(bone.initRotation, targetBone.rotation, this.targetWeight) : bone.initRotation;
    bone.rotation = this.mixValue(
      bone.rotation,
      initialRotation +
        Math.sin(((animation.rotateOffset - (animation.childOffset * level) ** (1 + animation.spring) + time) * Math.PI * 2) / animation.rotateTime) *
          animation.rotateRange *
          (1 + level * animation.affectByLevel) ** (1 + animation.springLevel) +
        animation.rotateCenter,
      weight,
    );

    let scaleOffset = 0;
    if (animation.scaleYRange !== 0) {
      const initialScaleY = useTarget ? this.mixValue(bone.initScaleY, targetBone.scaleY, this.targetWeight) : bone.initScaleY;
      scaleOffset =
        Math.sin(
          ((animation.scaleYOffset - (animation.scaleYChildOffset * level) ** (1 + animation.scaleYSpring) + time) * Math.PI * 2) / animation.scaleYTime,
        ) *
          animation.scaleYRange *
          (1 + level * animation.scaleYAffectByLevel) ** (1 + animation.springLevel) +
        animation.scaleYCenter;
      bone.scaleY = this.mixValue(bone.scaleY, initialScaleY + scaleOffset, weight);
      if (animation.sinScaleXSameAsY) {
        const initialScaleX = useTarget ? this.mixValue(bone.initScaleX, targetBone.scaleX, this.targetWeight) : bone.initScaleX;
        bone.scaleX = this.mixValue(bone.scaleX, initialScaleX + scaleOffset, weight);
      }
    }
    if (!animation.sinScaleXSameAsY && animation.scaleXRange !== 0) {
      const initialScaleX = useTarget ? this.mixValue(bone.initScaleX, targetBone.scaleX, this.targetWeight) : bone.initScaleX;
      scaleOffset =
        Math.sin(
          ((animation.scaleXOffset - (animation.scaleXChildOffset * level) ** (1 + animation.scaleXSpring) + time) * Math.PI * 2) / animation.scaleXTime,
        ) *
          animation.scaleXRange *
          (1 + level * animation.scaleXAffectByLevel) ** (1 + animation.springLevel) +
        animation.scaleXCenter;
      bone.scaleX = this.mixValue(bone.scaleX, initialScaleX + scaleOffset, weight);
    }
    if (animation.moveXRange !== 0) {
      const initialX = useTarget ? this.mixValue(bone.initX, targetBone.x, this.targetWeight) : bone.initX;
      const moveXOffset =
        Math.sin(((animation.moveXOffset - (animation.moveXChildOffset * level) ** (1 + animation.moveXSpring) + time) * Math.PI * 2) / animation.moveXTime) *
          animation.moveXRange *
          (1 + level * animation.moveXAffectByLevel) ** (1 + animation.springLevel) +
        animation.moveXCenter;
      bone.x = this.mixValue(bone.x, initialX + moveXOffset, weight);
    }
    if (animation.moveYRange !== 0) {
      const initialY = useTarget ? this.mixValue(bone.initY, targetBone.y, this.targetWeight) : bone.initY;
      const moveYOffset =
        Math.sin(((animation.moveYOffset - (animation.moveYChildOffset * level) ** (1 + animation.moveYSpring) + time) * Math.PI * 2) / animation.moveYTime) *
          animation.moveYRange *
          (1 + level * animation.moveYAffectByLevel) ** (1 + animation.springLevel) +
        animation.moveYCenter;
      bone.y = this.mixValue(bone.y, initialY + moveYOffset, weight);
    }
    bone.children.forEach((child, childIndex) => {
      const targetChild = useTarget ? targetBone.children[childIndex] : null;
      this.updateSineMode(animation, time, child, targetChild, level + 1, weight);
    });
  }

  updateWiggleMode(frequency, amplitude, octaves, time, delay, persistence = 0.5) {
    let value = 0;
    let octaveAmplitude = 1;
    const octaveCount = octaves + 1;
    const baseFrequency = 1 / (2 - 1 / 2 ** (octaveCount - 1));
    let currentFrequency = baseFrequency;
    let amplitudeTotal = 0;
    for (let octave = 0; octave < octaveCount; octave += 1) {
      value += octaveAmplitude * Math.sin((time * currentFrequency * Math.PI * 2) / frequency + delay);
      currentFrequency = baseFrequency * 1.5 ** (octave + 1);
      amplitudeTotal += octaveAmplitude;
      octaveAmplitude *= persistence;
    }
    return (value / amplitudeTotal) * amplitude;
  }

  updatePhysicMode(animation, history, bone, time, deltaScale, weight) {
    const moveX = Math.min(animation.limitRange, Math.max(-animation.limitRange, bone.autoMovePrevWorldX - bone.worldX));
    const moveY = Math.min(animation.limitRange, Math.max(-animation.limitRange, bone.autoMovePrevWorldY - bone.worldY));
    history.speedX += (animation.affectByX * moveX - history.speedX) * animation.speed * deltaScale;
    history.speedY += (animation.affectByY * moveY - history.speedY) * animation.speed * deltaScale;
    bone.autoMovePrevWorldX = bone.worldX;
    bone.autoMovePrevWorldY = bone.worldY;
    const rotation = animation.affectByRange * (-history.speedX * bone.c + history.speedY * bone.d);
    bone.rotation = this.mixValue(bone.rotation, rotation + bone.initRotation, weight);
    history.buffer.push({ time, delta: rotation });
    if (history.buffer.length > 300) history.buffer.shift();
    bone.children.forEach((child) => {
      this.updateFollowMode(animation, history, child, time, 1, weight);
    });
  }

  updateFollowMode(animation, history, bone, time, level, weight) {
    if (!this.endBoneName.includes(bone.data.name)) {
      bone.rotation = this.mixValue(
        bone.rotation,
        bone.initRotation +
          this.getHistoryRotate(time - animation.delay * (1 + level * animation.spring), history.buffer) *
            animation.rotateMoveRange *
            (1 + level * animation.affectByLevel) ** (1 + animation.springLevel),
        weight,
      );
      bone.children.forEach((child) => {
        this.updateFollowMode(animation, history, child, time, level + 1, weight);
      });
    }
  }

  updateSpringMagic(animation, bone, targetBone, time, deltaScale, level, weight, scaleDirection) {
    if (this.endBoneName.includes(bone.data.name)) return;

    bone.updateWorldTransform();
    bone.autoMovePrevWorldX = bone.worldX;
    bone.autoMovePrevWorldY = bone.worldY;
    const useTarget = targetBone && targetBone.data.name !== this.targetEndBoneName;
    const initialRotation = useTarget ? this.mixValue(bone.initRotation, targetBone.rotation, this.targetWeight) : bone.initRotation;
    const transformBone = animation.springUseTarget && targetBone ? targetBone : bone;
    const levelScale = 1 + level * animation.affectByLevel;
    const springScale = levelScale ** (1 + animation.springLevel);
    const delay = animation.delay * springScale * (1 + animation.springRot * levelScale) * deltaScale * (level === 0 ? 1 + animation.spring : 1);
    const { friction, forceX, forceY } = animation;
    const residualForce = 1 - animation.windAccel;

    if (bone.children.length > 0) {
      bone.children.forEach((child, childIndex) => {
        if (childIndex === 0) {
          const childWorldX = child.x * transformBone.a + child.y * transformBone.b + bone.worldX;
          const childWorldY = child.x * transformBone.c + child.y * transformBone.d + bone.worldY;
          bone.autoMoveSpeedX += (childWorldX - child.autoMovePrevWorldX) * delay;
          bone.autoMoveSpeedY += (childWorldY - child.autoMovePrevWorldY) * delay;
          bone.autoMoveSpeedX *= friction;
          bone.autoMoveSpeedY *= friction;
          bone.autoMoveSpeedX += forceX * animation.windAccel;
          bone.autoMoveSpeedY += forceY * animation.windAccel;
          const targetX = child.autoMovePrevWorldX + bone.autoMoveSpeedX + forceX * residualForce;
          const targetY = child.autoMovePrevWorldY + bone.autoMoveSpeedY + forceY * residualForce;
          const localRotation = bone.worldToLocalRotation(
            scaleDirection * Math.atan2(targetY - bone.worldY, scaleDirection * (targetX - bone.worldX)) * RADIANS_TO_DEGREES +
              (level === 0 ? animation.rotateOffset : 0),
          );
          const targetRotation = Math.min(animation.limitRange, Math.max(-animation.limitRange, localRotation - initialRotation)) + initialRotation;
          bone.rotation = this.mixValue(
            bone.rotation,
            initialRotation * animation.speed + (1 - animation.speed) * targetRotation,
            weight * bone.autoMoveFriction,
          );
          bone.updateWorldTransform();
        }
        const targetChild = useTarget ? targetBone.children[childIndex] : null;
        this.updateSpringMagic(animation, child, targetChild, time, deltaScale, level + 1, weight, scaleDirection);
      });
    } else {
      const tailWorldX = bone.x * transformBone.a + bone.y * transformBone.b + bone.worldX;
      const tailWorldY = bone.x * transformBone.c + bone.y * transformBone.d + bone.worldY;
      bone.autoMoveSpeedX += (tailWorldX - bone.tailAutoMovePrevWorldX) * delay;
      bone.autoMoveSpeedY += (tailWorldY - bone.tailAutoMovePrevWorldY) * delay;
      bone.autoMoveSpeedX *= friction;
      bone.autoMoveSpeedY *= friction;
      bone.autoMoveSpeedX += forceX * animation.windAccel;
      bone.autoMoveSpeedY += forceY * animation.windAccel;
      const targetX = bone.tailAutoMovePrevWorldX + bone.autoMoveSpeedX + forceX * residualForce;
      const targetY = bone.tailAutoMovePrevWorldY + bone.autoMoveSpeedY + forceY * residualForce;
      const localRotation = bone.worldToLocalRotation(
        scaleDirection * Math.atan2(targetY - bone.worldY, scaleDirection * (targetX - bone.worldX)) * RADIANS_TO_DEGREES +
          (level === 0 ? animation.rotateOffset : 0),
      );
      const targetRotation = Math.min(animation.limitRange, Math.max(-animation.limitRange, localRotation - initialRotation)) + initialRotation;
      bone.rotation = this.mixValue(bone.rotation, initialRotation * animation.speed + (1 - animation.speed) * targetRotation, weight * bone.autoMoveFriction);
      bone.updateWorldTransform();
      bone.tailAutoMovePrevWorldX = bone.x * bone.a + bone.y * bone.b + bone.worldX;
      bone.tailAutoMovePrevWorldY = bone.x * bone.c + bone.y * bone.d + bone.worldY;
    }
    bone.autoMoveFriction += 0.1 * (1 - bone.autoMoveFriction) * deltaScale;
  }

  updateElasic(animation, bone, deltaScale, weight) {
    if (!this.endBoneName.includes(bone.data.name)) {
      const parent = bone.parent;
      const targetWorldX = bone.initX * parent.a + bone.initY * parent.b + parent.worldX;
      const targetWorldY = bone.initX * parent.c + bone.initY * parent.d + parent.worldY;
      bone.elasticSpeedX += (targetWorldX - bone.autoMovePrevWorldX) * animation.elasticSpring * deltaScale;
      bone.elasticSpeedX *= animation.elasticFriction;
      bone.elasticSpeedY += (targetWorldY - bone.autoMovePrevWorldY) * animation.elasticSpringY * deltaScale;
      bone.elasticSpeedY *= animation.elasticFrictionY;
      bone.autoMovePrevWorldX += bone.elasticSpeedX;
      bone.autoMovePrevWorldY += bone.elasticSpeedY;
      const local = parent.worldToLocal({
        x: bone.autoMovePrevWorldX,
        y: bone.autoMovePrevWorldY,
      });
      if (!Number.isNaN(local.x) && !Number.isNaN(local.y)) {
        bone.x = this.mixValue(bone.x, local.x * animation.elasticSoftness + (1 - animation.elasticSoftness) * bone.initX, weight * bone.autoMoveFriction);
        bone.y = this.mixValue(bone.y, local.y * animation.elasticSoftnessY + (1 - animation.elasticSoftnessY) * bone.initY, weight * bone.autoMoveFriction);
        bone.autoMoveFriction += 0.1 * (1 - bone.autoMoveFriction) * deltaScale;
      }
    }
  }

  updateKeyFrameMode(animation, bone, time, weight) {
    const frameTime = time + animation.delay + 1000;
    const applyFrames = (frames, framesEnd, property) => {
      if (framesEnd > 0) {
        const localTime = frameTime % framesEnd;
        const block = Keyframe.getBlock(frames, localTime);
        const startValue = block.start.value;
        const endValue = block.end.value;
        const startTime = block.start.start;
        const endTime = block.end.start;
        bone[property] = this.mixValue(
          bone[property],
          (endValue - startValue) * block.end.easeFunc((localTime - startTime) / (endTime - startTime)) + startValue,
          weight,
        );
      }
    };
    applyFrames(animation.xFrames, animation.xFramesEnd, "x");
    applyFrames(animation.yFrames, animation.yFramesEnd, "y");
    if (animation.sxFramesEnd > 0) {
      applyFrames(animation.sxFrames, animation.sxFramesEnd, "scaleX");
      if (animation.sYSameAsSX) bone.scaleY = bone.scaleX;
      else applyFrames(animation.syFrames, animation.syFramesEnd, "scaleY");
    }
  }

  get currentTrackName() {
    return this.spineObj.state.tracks.length ? this.spineObj.state.tracks[0].animation.name : "";
  }

  get currentAnimation() {
    const animationName = this.spineObj.state.tracks[0].animation.name;
    return this.animation[animationName] || this.defaultAnimation;
  }

  get defaultAnimation() {
    return this.animation.default;
  }
}

export default AutoBone;
