#if USE_TEXTURE == 1
  uniform sampler2D diffuse;
  varying vec2 vUv;
#else
  uniform vec3 color;
#endif

uniform float opacity;
varying vec3 vNormal;

void main(){
  #if USE_TEXTURE == 1
    gl_FragColor = texture2D(diffuse,vUv);
  #else
    gl_FragColor = vec4(color,1.);
  #endif

  #if ALPHA_TEST == 1
      if(gl_FragColor.a<.5){
    discard;
}

  #endif
  float a2 = dot(vec3(0., 0.02, 1), vNormal);
  gl_FragColor.a*=opacity;
  gl_FragColor.rgb = vec3(1.);
  gl_FragColor.a = smoothstep(0.3, 1., 0.92 - a2 * 0.8);
}

