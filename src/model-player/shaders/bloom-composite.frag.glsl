uniform sampler2D diffuse;
uniform sampler2D blurMap;
uniform float desatura;
varying vec2 vUv;

const float threshold = 0.2;
const float intensity = 0.4;

vec3 Desaturate(vec3 color, float Desaturation){
		vec3 grayXfer = vec3(0.3, 0.59, 0.11);
		vec3 gray = vec3(dot(grayXfer, color));
		return mix(color, gray, Desaturation);
}



void main(){
  vec4 diffuseColor = texture2D(diffuse, vUv);
  vec4 blurColor = texture2D(blurMap, vUv);

  #ifdef USE_BG_BLUR
    vec3 highlight = Desaturate(max((mix(vec3(.5),blurColor.rgb,2.0)-threshold)*intensity,0.), 1. - desatura);
    gl_FragColor = vec4(1.0-(1.0-diffuseColor.rgb)*(1.0-highlight),diffuseColor.a);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, diffuseColor.rgb, .5);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, blurColor.rgb, .3);

  #else
    vec3 highlight = Desaturate(max((mix(vec3(.5),blurColor.rgb,2.0)-threshold)*intensity,0.), 1. - desatura);
    gl_FragColor = vec4(1.0-(1.0-.96*pow(Desaturate(diffuseColor.rgb, 1. - desatura),vec3(1.3))*vec3(1.,1.,1.))*(1.0-highlight),diffuseColor.a);
  #endif
}
