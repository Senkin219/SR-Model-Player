import { configureCanvas } from "./CanvasTextConfig.js";

const fontMetricsCache = new Map();
let measurementContext;

function measureFontMetrics(fontFamily, fontSize) {
  const container = document.createElement("div");
  const image = document.createElement("img");
  const span = document.createElement("span");
  const body = document.body;

  container.style.visibility = "hidden";
  container.style.fontFamily = fontFamily;
  container.style.fontSize = fontSize;
  container.style.margin = "0";
  container.style.padding = "0";
  container.style.whiteSpace = "nowrap";
  body.appendChild(container);

  image.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  image.width = 1;
  image.height = 1;
  image.style.margin = "0";
  image.style.padding = "0";
  image.style.verticalAlign = "baseline";

  span.style.fontFamily = fontFamily;
  span.style.fontSize = fontSize;
  span.style.margin = "0";
  span.style.padding = "0";
  span.appendChild(document.createTextNode("Hidden Text"));
  container.appendChild(span);
  container.appendChild(image);

  const baseline = image.offsetTop - span.offsetTop + 2;
  container.removeChild(span);
  container.appendChild(document.createTextNode("Hidden Text"));
  container.style.lineHeight = "normal";
  image.style.verticalAlign = "super";
  const middle = image.offsetTop - container.offsetTop + 2;
  body.removeChild(container);
  return { baseline, middle };
}

function measureWord(word) {
  const { style, text } = word;
  const fontKey = `${style.fontSize}${style.fontFamily}`;
  let fontMetrics = fontMetricsCache.get(fontKey);
  if (!fontMetrics) {
    fontMetrics = measureFontMetrics(style.fontFamily, `${style.fontSize}px`);
    fontMetricsCache.set(fontKey, fontMetrics);
  }
  if (!measurementContext) {
    const canvas = typeof document !== "undefined" ? document.createElement("canvas") : undefined;
    measurementContext = canvas !== undefined ? canvas.getContext("2d") : undefined;
  }
  configureCanvas(style, measurementContext);
  return {
    ...fontMetrics,
    width: measurementContext.measureText(text).width,
  };
}

export default function getWordLayout(word) {
  const measurement = measureWord(word);
  const lineHeight = word.style.fontSize;
  return {
    width: measurement.width,
    height: 2 * measurement.middle,
    lineHeight,
    xOffset: 0,
    yOffset: measurement.baseline,
    ascent: measurement.baseline,
    maxAscent: lineHeight,
  };
}
