import parseStyleValue from "./StyleParser.js";

export default function normalizeStyle(source, propertyMap) {
  const normalized = {};
  Object.keys(source).forEach((sourceKey) => {
    if (source[sourceKey] === undefined) return;
    const lowerKey = sourceKey.toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(propertyMap, lowerKey)) return;
    const property = propertyMap[lowerKey];
    const value = parseStyleValue(property, source[sourceKey]);
    if (value !== undefined) normalized[property] = value;
  });
  return normalized;
}
