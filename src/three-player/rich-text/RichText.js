import * as THREE from "three";
import TokenType from "./TokenType.js";
import parseRichText from "./RichTextParser.js";
import normalizeStyle from "./NormalizeStyle.js";
import createDefaultTextStyle from "./DefaultTextStyle.js";
import layoutText from "./TextLayout.js";
import drawTextBlocks from "./CanvasTextWriter.js";

const STYLE_PROPERTY_MAP = {
  fontsize: "fontSize",
  size: "fontSize",
  fontvariant: "fontVariant",
  variant: "fontVariant",
  fontfamily: "fontFamily",
  family: "fontFamily",
  fontweight: "fontWeight",
  weight: "fontWeight",
  fontstyle: "fontStyle",
  style: "fontStyle",
  fontstretch: "fontStretch",
  stretch: "fontStretch",
  color: "color",
  width: "width",
  newline: "newLine",
  linespacing: "lineSpacing",
  spacewidth: "spaceWidth",
  whitespace: "whiteSpace",
  textalign: "textAlign",
  align: "textAlign",
  lineheight: "lineHeight",
  strokewidth: "strokeWidth",
  strokecolor: "strokeColor",
  verticalalign: "verticalAlign",
};

function isBlockTag(tag) {
  return tag === "p" || tag === "div";
}

function tagStyle(tag) {
  switch (tag) {
    case "b":
    case "strong":
      return { fontWeight: "bold" };
    case "em":
    case "i":
      return { fontStyle: "italic" };
    default:
      return {};
  }
}

function createBlockTree(source, initialStyle) {
  const root = { children: [], style: initialStyle };
  const parentStack = [];
  const styleStack = [];
  let currentBlock = root;
  let currentLine;
  let currentStyle = initialStyle;

  parseRichText(source.replace(/\r\n/g, "\n")).forEach((token) => {
    switch (token.type) {
      case TokenType.Text:
        if (!currentLine) {
          currentLine = { words: [] };
          currentBlock.children.push(currentLine);
        }
        currentLine.words.push({ text: token.text, style: currentStyle });
        break;

      case TokenType.OpenTag:
        if (isBlockTag(token.tag)) {
          styleStack.push(currentStyle);
          currentStyle = {
            ...currentStyle,
            ...normalizeStyle(token.style, STYLE_PROPERTY_MAP),
          };
          const block = { children: [], style: currentStyle };
          currentBlock.children.push(block);
          parentStack.push(currentBlock);
          currentBlock = block;
          currentLine = undefined;
        } else if (token.tag === "br") {
          currentLine = undefined;
        } else {
          styleStack.push(currentStyle);
          currentStyle = {
            ...currentStyle,
            ...tagStyle(token.tag),
            ...normalizeStyle(token.style, STYLE_PROPERTY_MAP),
          };
        }
        break;

      case TokenType.CloseTag:
        if (isBlockTag(token.tag)) {
          const closingBlock = currentBlock;
          currentBlock = parentStack.pop();
          currentLine = undefined;
          if (closingBlock.children.length === 0) {
            currentBlock.children.splice(currentBlock.children.indexOf(closingBlock), 1);
          }
          currentStyle = styleStack.pop();
        } else if (token.tag !== "br") {
          currentStyle = styleStack.pop();
        }
        break;

      default:
        break;
    }
  });
  return root;
}

const defaultStyle = createDefaultTextStyle();

function parseBlocks(text, style = createDefaultTextStyle()) {
  return layoutText(createBlockTree(text, style));
}

function drawBlocks(blocks, canvas, options = {}) {
  const { x = 10, y = 10, align = "top", clear = true, background = null } = options;
  const context = canvas.getContext("2d");
  if (clear) {
    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  let offsetY = y;
  if (align === "middle") offsetY += context.canvas.height / 2 - blocks.height / 2;
  else if (align === "bottom") offsetY += context.canvas.height - blocks.height;
  drawTextBlocks(blocks, context, x, offsetY, true);
  drawTextBlocks(blocks, context, x, offsetY, false);
}

function updateTextTexture(texture, text) {
  const blocks = parseBlocks(text, texture.drawStyle);
  drawBlocks(blocks, texture.image, texture.drawOffset);
  texture.needsUpdate = true;
  return blocks;
}

function createTextTexture(options = {}) {
  const {
    wrapT = THREE.ClampToEdgeWrapping,
    wrapS = THREE.ClampToEdgeWrapping,
    minFilter = THREE.LinearFilter,
    width = 300,
    height = 300,
    x = 5,
    y = 10,
    align = "top",
    text = "",
  } = options;
  const canvas = document.createElement("canvas");
  const texture = new THREE.CanvasTexture(canvas, undefined, wrapS, wrapT, THREE.LinearFilter, minFilter);
  canvas.width = width;
  canvas.height = height;
  texture.drawStyle = Object.assign(createDefaultTextStyle(), options);
  texture.drawStyle.width = width - 2 * x;
  texture.drawOffset = { x, y, align };
  const blocks = text ? updateTextTexture(texture, text) : null;
  return { texture, blocks };
}

export default {
  createTextTexture,
  updateTextTexture,
  drawBlocks,
  parseBlocks,
  defaultStyle,
};
