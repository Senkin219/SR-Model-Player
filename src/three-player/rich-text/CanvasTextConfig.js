export function configureCanvas(style, context) {
  context.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontStretch} ${style.fontSize}px ${style.fontFamily}`;
  context.textBaseline = "alphabetic";
  context.fillStyle = style.color;
  context.lineWidth = style.strokeWidth;
  context.strokeStyle = style.strokeColor;
}
