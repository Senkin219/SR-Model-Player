import * as THREE from "three";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

const valueConstructors = {
  v2: THREE.Vector2,
  v3: THREE.Vector3,
  v4: THREE.Vector4,
  q: THREE.Quaternion,
  c: THREE.Color,
};

const easeFamilies = {
  sine: "sine",
  linear: "none",
  power2: "power2",
  power3: "power3",
  power4: "power4",
  back: "back",
  elastic: "elastic",
  bounce: "bounce",
};

const easeDirections = {
  in: "in",
  out: "out",
  inout: "inOut",
  none: "none",
};

const customEaseCache = {};

export const matrixMatch = ["position", "scale", "quaternion", "rotation"];

export class AnimationUtils {
  static getConstructor(valueType) {
    return valueConstructors[valueType];
  }

  static easeFunction(description) {
    if (description.indexOf("custom ") === 0) {
      const curve = description.substring(7);
      if (!customEaseCache[curve]) {
        customEaseCache[curve] = CustomEase.create(curve, curve);
      }
      return customEaseCache[curve];
    }

    const parts = description.toLowerCase().split(".");
    const family = easeFamilies[parts[0]];
    const direction = easeDirections[parts[1]] || easeDirections.none;
    return family ? gsap.parseEase(family === "none" ? "none" : `${family}.${direction}`) : gsap.parseEase("none");
  }

  static parseValueType(value) {
    let valueType;
    let valueLength;
    if (Array.isArray(value)) {
      valueType = "a";
      valueLength = value.length;
    } else if (value.isQuaternion) {
      valueType = "q";
      valueLength = 4;
    } else if (value.isVector3) {
      valueType = "v3";
      valueLength = 3;
    } else if (value.isVector4) {
      valueType = "v4";
      valueLength = 4;
    } else if (value.isEuler) {
      valueType = "r";
      valueLength = 3;
    } else if (value.isVector2) {
      valueType = "v2";
      valueLength = 2;
    } else if (value.isColor) {
      valueType = "c";
      valueLength = 3;
    } else if (value.isTexture) {
      valueType = "t";
      valueLength = 1;
    } else if (typeof value === "string") {
      valueType = "str";
      valueLength = 1;
    } else if (typeof value === "boolean") {
      valueType = "b";
      valueLength = 1;
    } else {
      valueType = "f";
      valueLength = 1;
    }
    return { valueType, valueLength };
  }

  static parsePath(root, path) {
    const pathParts = path.split(".");
    let object;
    let target;
    if (root && root.isObject3D) {
      target = object = root.getObjectByName(pathParts[0]);
    } else {
      target = root;
    }
    if (!target) return null;
    const propertyIndex = pathParts.length - 1;
    for (let index = 1; index < propertyIndex; index += 1) {
      target = target[pathParts[index]];
      if (!target) return null;
    }
    return { target, object, prop: pathParts[propertyIndex] };
  }

  static parseData(values, itemSize) {
    const itemCount = values.length / itemSize;
    const result = new Array(itemCount);
    for (let index = 0; index < itemCount; index += 1) {
      result[index] = Array.from(values.slice(itemSize * index, itemSize * (index + 1))).map((value) => Number.parseFloat(value.toFixed(4)));
    }
    return result;
  }

  static check(values, itemSize) {
    if ((values.length / itemSize) % 1 !== 0) {
      throw new Error(`item size incorrect:${itemSize}==>${values}`);
    }
  }

  static initializeArray(frame, target, property) {
    if (target[`${property}_frame`] !== frame) {
      target[`${property}_frame`] = frame;
      target[property].forEach((_value, index) => {
        target[property][index] = 0;
      });
    }
  }

  static initializeFloat(frame, target, property) {
    if (target[`${property}_frame`] !== frame) {
      target[`${property}_frame`] = frame;
      target[property] = 0;
    }
  }

  static initializeColor(frame, target, property) {
    if (target[`${property}_frame`] !== frame) {
      target[`${property}_frame`] = frame;
      target[property].setRGB(0, 0, 0);
    }
  }

  static initializeVector(frame, target, property) {
    if (target[`${property}_frame`] !== frame) {
      target[`${property}_frame`] = frame;
      target[property].set(0, 0, 0, 0);
    }
  }

  static initializeQuaternion(frame, target, property) {
    if (target[`${property}_frame`] !== frame) {
      target[`${property}_frame`] = frame;
      target[property].set(0, 0, 0, 1);
    }
  }
}

export default AnimationUtils;
