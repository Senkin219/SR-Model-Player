import * as THREE from "three";

class AlphaStop {
  constructor(source, maximumIndex) {
    const { value = 100, percent = 0 } = source || {};
    this.value = Math.round(2.55 * value);
    this.percent = (percent / 100) * maximumIndex;
  }
}

class ColorStop {
  constructor(source, maximumIndex) {
    const { value = 0xffffff, percent = 0 } = source || {};
    this.r = (value >> 16) & 255;
    this.g = (value >> 8) & 255;
    this.b = value & 255;
    this.percent = (percent / 100) * maximumIndex;
  }
}

export function createGradient(gradient, size) {
  const { color = [], alpha = [] } = gradient;
  const colorStops = color.map((stop) => new ColorStop(stop, size - 1));
  const alphaStops = alpha.map((stop) => new AlphaStop(stop, size - 1));
  const pixels = new Uint8Array(4 * size);

  let nextPercent = colorStops[0].percent;
  let pixelIndex = 0;
  let differenceRed = 0;
  let differenceGreen = 0;
  let differenceBlue = 0;
  let differenceAlpha = 0;
  let sectionLength = 0;

  colorStops.forEach((stop, stopIndex) => {
    const { r, g, b } = stop;
    if (stopIndex === 0) {
      while (pixelIndex <= nextPercent) {
        pixels[4 * pixelIndex] = r;
        pixels[4 * pixelIndex + 1] = g;
        pixels[4 * pixelIndex + 2] = b;
        pixelIndex += 1;
      }
    } else if (stopIndex < colorStops.length) {
      while (pixelIndex <= nextPercent) {
        const distance = (nextPercent - pixelIndex) / sectionLength;
        pixels[4 * pixelIndex] = r + distance * differenceRed;
        pixels[4 * pixelIndex + 1] = g + distance * differenceGreen;
        pixels[4 * pixelIndex + 2] = b + distance * differenceBlue;
        pixelIndex += 1;
      }
    }

    if (stopIndex === colorStops.length - 1) {
      while (pixelIndex < size) {
        pixels[4 * pixelIndex] = r;
        pixels[4 * pixelIndex + 1] = g;
        pixels[4 * pixelIndex + 2] = b;
        pixelIndex += 1;
      }
    } else {
      const next = colorStops[stopIndex + 1];
      differenceRed = r - next.r;
      differenceGreen = g - next.g;
      differenceBlue = b - next.b;
      sectionLength = next.percent - nextPercent;
      nextPercent = next.percent;
    }
  });

  nextPercent = alphaStops[0].percent;
  pixelIndex = 0;
  alphaStops.forEach((stop, stopIndex) => {
    if (stopIndex === 0) {
      while (pixelIndex < nextPercent) {
        pixels[4 * pixelIndex + 3] = stop.value;
        pixelIndex += 1;
      }
    } else if (stopIndex < alphaStops.length) {
      while (pixelIndex <= nextPercent) {
        const distance = (nextPercent - pixelIndex) / sectionLength;
        pixels[4 * pixelIndex + 3] = stop.value + distance * differenceAlpha;
        pixelIndex += 1;
      }
    }

    if (stopIndex === alphaStops.length - 1) {
      while (pixelIndex < size) {
        pixels[4 * pixelIndex + 3] = stop.value;
        pixelIndex += 1;
      }
    } else {
      const next = alphaStops[stopIndex + 1];
      differenceAlpha = stop.value - next.value;
      sectionLength = next.percent - nextPercent;
      nextPercent = next.percent;
    }
  });

  return pixels;
}

export function createGradientTexture(gradient, size = 16) {
  const texture = new THREE.DataTexture(
    createGradient(gradient, size),
    size,
    1,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
    THREE.UVMapping,
    gradient.wrap,
    THREE.ClampToEdgeWrapping,
    THREE.LinearFilter,
    THREE.LinearFilter,
  );
  texture.needsUpdate = true;
  return texture;
}
