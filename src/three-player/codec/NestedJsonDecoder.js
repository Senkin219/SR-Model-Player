export function decodeNestedJson(source) {
  let decoded = source;
  let parseCount = 0;

  while (typeof decoded === "string" && parseCount < 2) {
    decoded = JSON.parse(decoded);
    parseCount += 1;
  }

  return decoded;
}
