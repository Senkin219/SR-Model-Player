#if USE_TEXTURE == 1
  uniform sampler2D diffuse;
  varying vec2 vUv;
#else
  uniform vec3 color;
#endif

uniform float opacity;
uniform float time;
uniform sampler2D mask;
uniform sampler2D noise_1;
uniform sampler2D noise_2;

void main(){
  vec4 noiseColor = texture2D(diffuse,vUv);
  vec4 maskColor = texture2D(mask,vUv);
  vec4 noiseColor1 = texture2D(noise_1, vec2(vUv.x * 1.2 + time * 0.7, vUv.y * 1.6));
  vec4 noiseColor2 = texture2D(noise_2, vUv * 0.4 + time * 0.2);

  vec3 color = mix(vec3(0., 144./255., 156./255.), vec3(99./255., 243./255., 214./255.)*1., (noiseColor1.r));
  gl_FragColor = vec4(color.rgb * (1. + smoothstep(0.2, 1., 1. - vUv.x) * 1.1), 1.);

  gl_FragColor.a = smoothstep(-0.3, 1., 1. - vUv.x) * noiseColor1.r * 3.;

  gl_FragColor.a *= 1. - smoothstep(0.8, 1., 1. - vUv.x);



  // gl_FragColor = vec4(1., 0., 0., 1.);
  // gl_FragColor.a = 1.;

  if (fract(noiseColor2.r * 1.3 + time * 1.7) < 0.9 * smoothstep(0.55, 1., (1. - vUv.x))) {
    discard;
  }

  
}

