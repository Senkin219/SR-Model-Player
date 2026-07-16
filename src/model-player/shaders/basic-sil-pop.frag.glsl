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
  gl_FragColor.a*=0.64;

  float a2 = dot(vec3(0, -0.1, 1), vNormal);
  vec3 color = mix(vec3(165./255., 143./255., 221./255.), vec3(255./255., 173./255., 253./255.), a2 - 0.2);
  gl_FragColor.rgb = color;
}

