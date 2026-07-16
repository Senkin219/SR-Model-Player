varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix*vec4(position,1.0);
  vViewDir = -normalize(mvPosition.xyz);
  gl_Position = projectionMatrix*mvPosition;
  gl_Position.z = log2( max( 0.000001, gl_Position.w + 1.0 ) ) * 0.18237350163834035 - 1.0;
gl_Position.z *= gl_Position.w;

}
