const float x_ = 1.0/255.0;
const float y_ = 1./65025.0;
const float z_ = 1./160581375.0;

float DecodeDepth( vec4 val ) {
	return mix(1000.,1000.*dot( val, vec4(1.0, x_, y_, z_ )),val.a);
}

vec4 EncodeDepth( float v ) {
		vec4 enc = vec4(1.0, 255.0, 65025.0, 160581375.0) * v /1000.;
		enc = fract(enc);
		enc -= enc.yzww * vec4(x_,x_,x_,0.0);
		return vec4(enc.xyz,1.);
}


uniform vec3 strokeColor;
uniform vec4 brightness;
uniform float exposure;

uniform float opacity;

varying vec2 vUv;
varying vec3 vViewDir;
varying vec3 vNormal;
varying vec3 vColor;

#if SIMPLE_MODE == 1
uniform sampler2D lightMap;
uniform vec3 strokeColor2;
uniform vec3 strokeColor3;
uniform vec3 strokeColor4;
uniform vec3 strokeColor5;
uniform vec3 strokeColor6;
uniform vec3 strokeColor7;

vec3 fetchStrokeColor(in float a){
  vec3 color;
  if (a > 0.8){
    color = strokeColor;
  }else if (a > .7){
    color = strokeColor2;
  }else if (a > .6){
    color = strokeColor3;
  }else if (a > .45){
    color = strokeColor4;
  }else if (a > .3){
    color = strokeColor5;
  }else if (a > .2){
    color = strokeColor6;
  }else if (a > .1){
    color = strokeColor7;
  }else{
    color = strokeColor;
  }
  return color;
}
#endif

#if USE_DEPTH > 0
  varying vec4 vViewPosition;
  varying float vCameraAngle;
  uniform sampler2D faceDepthMap;
  uniform vec2 resolution;
#endif

void main(){
  #if DISCARD == 1
    gl_FragColor = vec4(0.);    
    discard;
  #else
    #if SIMPLE_MODE == 1
      vec4 lightTexColor = texture2D(lightMap, vUv.xy); 
      vec3 color = fetchStrokeColor(lightTexColor[MAT_CHANNEL]);
    #else
      vec3 color = strokeColor;    
    #endif

    float rim = clamp(1.-dot(vViewDir, -vNormal),0.,1.);
    gl_FragColor = vec4(color,opacity);
    gl_FragColor.rgb = mix(gl_FragColor.rgb,brightness.rgb,smoothstep(0.,.4,brightness.a)*smoothstep(0.,1.-rim,brightness.a));//);
    gl_FragColor.rgb *= (1.+exposure);
  #endif

  #if USE_DEPTH > 0
    vec4 faceDepthColor = texture2D(faceDepthMap, gl_FragCoord.xy/resolution);
    float faceWorldDepth = DecodeDepth(faceDepthColor);
    gl_FragColor.a *= mix(1., clamp((faceWorldDepth - vViewPosition.z)/1200.,0.,1.),vCameraAngle*faceDepthColor.a);

    //gl_FragColor = faceDepthColor;
  #endif

  #if HIDE_FLOWER == 1
    if (vColor.g * 100. > 125./255. && vColor.g * 100. < 259./255.) {
    discard;
    }
  #endif
}
