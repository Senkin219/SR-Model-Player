import { gsap } from "gsap";

export function tweenTo(target, duration, options) {
  return new Promise((resolve, reject) => {
    try {
      gsap.to(target, {
        onComplete() {
          resolve();
        },
        duration,
        ...options,
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function tweenFromTo(target, duration, from, options) {
  return new Promise((resolve, reject) => {
    try {
      gsap.fromTo(target, from, {
        onComplete() {
          resolve();
        },
        duration,
        ...options,
      });
    } catch (error) {
      reject(error);
    }
  });
}
