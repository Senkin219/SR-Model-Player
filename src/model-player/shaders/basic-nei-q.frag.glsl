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
  gl_FragColor.a*=opacity;
  if (vNormal.y > 0.2) {
    gl_FragColor.rgb = vec3(221./256., 239./256., 1.);
  } else {
    gl_FragColor.rgb = vec3(118./256., 148./256., 193./256.);;
  }
}

