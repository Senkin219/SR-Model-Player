import getWordLayout from "./HtmlParser.js";

function isWhitespace(word) {
  const firstCharacter = word.text.charAt(0);
  return firstCharacter === " " || firstCharacter === "\t" || firstCharacter === "\v" || firstCharacter === "\f";
}

function alignLines(lines, style) {
  lines.forEach((line) => {
    if (line.vertices.length === 0) return;
    const remainingWidth = style.width - line.width;
    switch (style.textAlign) {
      case "left":
        break;
      case "center": {
        const offset = Math.floor(remainingWidth / 2);
        line.vertices.forEach((vertex) => {
          vertex.x += offset;
        });
        break;
      }
      case "right":
        line.vertices.forEach((vertex) => {
          vertex.x += remainingWidth;
        });
        break;
      case "justify":
        if (line.vertices.length > 1 && line.width > 0.5 * style.width) {
          const wordsWidth = line.vertices.reduce((width, vertex) => width + vertex.width, 0);
          let previousVertex = line.vertices[0];
          line.vertices[line.vertices.length - 1].x += remainingWidth;
          const space = (style.width - wordsWidth) / (line.vertices.length - 1);
          let rightEdge = previousVertex.width;
          for (let index = 1; index < line.vertices.length - 1; index += 1) {
            line.vertices[index].x = rightEdge + space;
            rightEdge = line.vertices[index].x + line.vertices[index].width;
          }
        }
        break;
      default:
        break;
    }

    if (style.verticalAlign === "middle") {
      const maximumHeight = line.vertices.sort((left, right) => right.height - left.height)[0].height;
      line.vertices.forEach((vertex) => {
        vertex.y -= ((maximumHeight - vertex.height) * (vertex.drawOffsetY / vertex.height)) / 2;
      });
    }
  });
}

function layoutWords(wordGroup, style, initialY, allVertices) {
  let line = { height: 0, width: 0, maxAscent: 0, vertices: [] };
  const lines = [line];
  const cursor = { x: 0, y: initialY };
  let atLineStart = true;
  let pendingSpace = 0;
  const ascentMap = new Map();

  for (const word of wordGroup.words) {
    const isNewLine = word.text.charAt(0) === "\n";
    if (isWhitespace(word) || (isNewLine && style.newLine === "space")) {
      if (style.whiteSpace === "collapse-all") {
        pendingSpace = atLineStart ? 0 : style.spaceWidth;
      } else if (style.whiteSpace === "collapse-outer") {
        if (atLineStart) pendingSpace = 0;
        else pendingSpace += style.spaceWidth * word.text.length;
      } else {
        pendingSpace += word.text.length * style.spaceWidth;
      }
    } else if (isNewLine) {
      if (style.newLine === "ignore") continue;
      cursor.x = 0;
      cursor.y += line.height + style.lineSpacing;
      line = { height: 0, width: 0, maxAscent: 0, vertices: [] };
      lines.push(line);
    } else {
      const measurement = getWordLayout(word);
      let x = cursor.x + pendingSpace;
      let y = cursor.y;
      if (x + measurement.width > style.width) {
        atLineStart = true;
        x = 0;
        pendingSpace = 0;
        y += line.height + style.lineSpacing;
        cursor.x = measurement.width;
        cursor.y = y;
        line = { height: 0, width: 0, maxAscent: 0, vertices: [] };
        lines.push(line);
      } else {
        cursor.x = x + measurement.width;
      }

      const staticLineOffset = measurement.maxAscent - measurement.ascent;
      const ascent = style.lineHeight === "static" ? measurement.maxAscent : measurement.ascent;
      const vertex = {
        type: "word",
        x,
        y: y + (style.lineHeight === "static" ? staticLineOffset : 0),
        drawOffsetX: measurement.xOffset,
        drawOffsetY: measurement.yOffset,
        width: measurement.width,
        height: measurement.height,
        style: word.style,
        text: word.text,
      };
      ascentMap.set(vertex, ascent);
      line.vertices.push(vertex);
      line.width += pendingSpace + vertex.width;
      line.maxAscent = Math.max(line.maxAscent, ascent);
      line.height = style.lineHeight === "static" ? Math.max(line.height, measurement.lineHeight) : Math.max(line.height, measurement.height);
      allVertices.push(vertex);
      pendingSpace = 0;
      atLineStart = false;
    }
  }

  lines.forEach((currentLine) => {
    currentLine.vertices.forEach((vertex) => {
      vertex.y += currentLine.maxAscent - ascentMap.get(vertex);
    });
  });
  alignLines(lines, style);
  return cursor.y + line.height + style.lineSpacing;
}

function layoutTree(block, initialY, vertices) {
  return block.children.reduce(
    (nextY, child) =>
      Object.prototype.hasOwnProperty.call(child, "children") ? layoutTree(child, nextY, vertices) : layoutWords(child, block.style, nextY, vertices),
    initialY,
  );
}

export default function layoutText(blockTree) {
  const vertices = [];
  layoutTree(blockTree, 0, vertices);
  if (vertices.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0, vertices: [] };
  }
  const x = vertices.reduce((minimum, vertex) => Math.min(minimum, vertex.x), Number.MAX_SAFE_INTEGER);
  const y = vertices.reduce((minimum, vertex) => Math.min(minimum, vertex.y), Number.MAX_SAFE_INTEGER);
  return {
    x,
    y,
    width: vertices.reduce((maximum, vertex) => Math.max(maximum, vertex.width + vertex.x), 0) - x,
    height: vertices.reduce((maximum, vertex) => Math.max(maximum, vertex.height + vertex.y), 0) - y,
    vertices,
  };
}
