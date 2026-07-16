import { configureCanvas } from "./CanvasTextConfig.js";

function drawVertex(vertex, context, offsetX, offsetY, stroke) {
  configureCanvas(vertex.style, context);
  const x = vertex.x + offsetX + vertex.drawOffsetX;
  const y = vertex.y + offsetY + vertex.drawOffsetY;
  if (stroke) {
    if (vertex.style.strokeWidth) context.strokeText(vertex.text, x, y);
  } else {
    context.fillText(vertex.text, x, y);
  }
}

export default function drawTextBlocks(blocks, context, offsetX, offsetY, stroke) {
  blocks.vertices.forEach((vertex) => {
    drawVertex(vertex, context, offsetX, offsetY, stroke);
  });
}
