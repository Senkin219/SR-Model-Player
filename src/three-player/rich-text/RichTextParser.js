import TokenType from "./TokenType.js";
import decodeHtmlEntities from "./HtmlEntities.js";

const TOKEN_PATTERN = /(<.+?>|\n|[^\S\n]+|[^<\s]+)/g;
const TAG_PATTERN = /<(\/?[a-zA-Z0-9]+)(.*?)>/;
const ATTRIBUTE_PATTERN = /(\S+)="(.+?)"/g;

function matchAll(source, pattern) {
  pattern.lastIndex = -1;
  const matches = [];
  if (String.prototype.matchAll !== undefined) {
    const iterator = source.matchAll(pattern);
    let result;
    while (!(result = iterator.next()).done) matches.push(result.value);
  } else {
    let match;
    while ((match = pattern.exec(source))) matches.push(match);
  }
  return matches;
}

function splitThaiWord(text) {
  if (!/[\u0e00-\u0e7f]+/.test(text)) return text;
  const characters = [];
  for (let index = 0; index < text.length; index += 1) {
    const character = text.charAt(index);
    if (/[^\u0e31\u0e33-\u0e39\u0e3a\u0e47-\u0e49\u0e4a-\u0e4e]/.test(character)) {
      characters.push(character);
    } else {
      characters[characters.length - 1] += character;
    }
  }
  return characters;
}

if (!Array.prototype.flat) {
  Object.defineProperty(Array.prototype, "flat", {
    configurable: true,
    value: function flatten(depth) {
      const remainingDepth = Number.isNaN(Number(depth)) ? 1 : Number(depth);
      return remainingDepth
        ? Array.prototype.reduce.call(
            this,
            (result, value) => {
              if (Array.isArray(value)) result.push(...flatten.call(value, remainingDepth - 1));
              else result.push(value);
              return result;
            },
            [],
          )
        : Array.prototype.slice.call(this);
    },
    writable: true,
  });
}

export default function parseRichText(source) {
  return matchAll(source, TOKEN_PATTERN)
    .map((match) => match[0])
    .reduce((tokens, sourceToken) => {
      if (sourceToken.charAt(0) === "<") {
        const tagMatch = sourceToken.match(TAG_PATTERN);
        if (!tagMatch) return tokens;
        const [, tagName, attributesSource] = tagMatch;
        if (tagName.charAt(0) === "/") {
          tokens.push({ type: TokenType.CloseTag, tag: tagName.substr(1).toLowerCase() });
          return tokens;
        }

        const style = Array.from(matchAll(attributesSource, ATTRIBUTE_PATTERN)).reduce((attributes, match) => {
          attributes[match[1]] = match[2];
          return attributes;
        }, {});
        const normalizedTag = tagName.toLowerCase();
        tokens.push({ type: TokenType.OpenTag, tag: normalizedTag, style });
        if (sourceToken.charAt(sourceToken.length - 2) === "/") {
          tokens.push({ type: TokenType.CloseTag, tag: normalizedTag });
        }
        return tokens;
      }

      const parts = sourceToken.split(/(\s|[\u30a0-\u30ff\u3040-\u309f\u4e00-\u9fa5\uac00-\ud7af]+)/);
      let words = [];
      parts.forEach((part) => {
        if (part === "") return;
        if (/[\uac00-\ud7ff\u4e00-\u9fa5]+/.test(part)) {
          words = words.concat(part.split(""));
        } else if (/[\u0e00-\u0e7f]+/.test(part)) {
          words = words.concat(
            part
              .split(/(\s|[\u0e00-\u0e7f]+[\u0e00-\u0e7f]+)/)
              .map(splitThaiWord)
              .flat(),
          );
        } else {
          words.push(part);
        }
      });
      words.forEach((word) => {
        if (word !== "") tokens.push({ type: TokenType.Text, text: decodeHtmlEntities(word) });
      });
      return tokens;
    }, []);
}
