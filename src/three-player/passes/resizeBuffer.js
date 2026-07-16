export function resizeBuffer(input, output) {
  if (output && input && (output.height !== input.height || output.width !== input.width)) {
    output.setSize(input.width, input.height);
  }
}
