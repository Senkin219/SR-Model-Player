
  uniform sampler2D diffuse;
  uniform float opacity;

  varying vec2 vUv;
  varying float vOpacity;

  void main() {
    vec4 color = texture2D(diffuse, vUv);
    color.a *= vOpacity * opacity;
    gl_FragColor = color;


    #if ALPHA_PAR == 1
      gl_FragColor.rgb = vec3(1., 1., 1.);
      if (gl_FragColor.a < 0.24) {
        discard;
      } else {
        gl_FragColor.a = 1.;
      }
    #endif
  
  }