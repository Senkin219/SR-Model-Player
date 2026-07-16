#include <common>
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


uniform sampler2D diffuse;
uniform sampler2D outlineMap;
uniform vec2 resolution;

uniform float rimIntensity;

#if USE_LIGHTMAP > 0
uniform sampler2D lightMap;
#endif

#if USE_ALPHA
uniform sampler2D alphaMap;
#endif

#if USE_MATMAP == 1
uniform sampler2D matMap;
#endif

uniform float metallness1;
uniform float metallness2;
uniform float metallness3;
uniform float metallness4;
uniform float metallness5;
uniform float metallness6;
uniform float metallness7;
uniform float metallness8;

const float lightArea = 0.5;

#if USE_SHADOW_RAMP == 1
uniform sampler2D shadowRamp;

const float shadowRampWidth = .5;
const float shadowTransitionRange = 0.001;
#endif

#if USE_METALMAP == 1
uniform sampler2D metalMap;
uniform vec3 metalLightColor;
uniform vec3 metalDarkColor;
#endif

uniform vec3 lightDir;

uniform vec4 shadowColor1;
uniform vec4 shadowColor2;
uniform vec4 shadowColor3;
uniform vec4 shadowColor4;
uniform vec4 shadowColor5;
uniform vec4 shadowColor6;
uniform vec4 shadowColor7;
uniform vec4 shadowColor8;

uniform vec4 brightness;

uniform float exposure;
 

varying vec2 vUv;
varying vec4 vNormalAndDiff;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec4 vViewPosition;
varying vec3 vColor;
varying float vCameraAngle;

#if USE_UV2 == 1
  varying vec2 vUv2;
#endif

#if USE_DEPTH > 0
  uniform sampler2D faceDepthMap;
#endif

float specularFactor(vec3 N, vec3 H, float shininess){
	return pow(max(dot(N, H), 0.001), shininess);
}

vec4 color3 = vec4(1., 1., 1., 1.);

void fetchMaterialInfo(float a, out vec4 shadowMultiColor, out float metalness){
  if (a > 0.8){
    shadowMultiColor = shadowColor1;
    metalness = metallness1;
    color3 = vec4(1., 0., 0., 1.);
  }else if (a > .7){
    shadowMultiColor = shadowColor2;
    metalness = metallness2;
    color3 = vec4(0., 0., 1., 1.);
  }else if (a > .6){
    shadowMultiColor = shadowColor3;
    metalness = metallness3;
    color3 = vec4(1., 1., 0., 1.);
  }else if (a > .45){
    shadowMultiColor = shadowColor4;
    metalness = metallness4;
  }else if (a > .3){
    metalness = metallness5;
    shadowMultiColor = shadowColor5;
  }else if (a > .2){
    metalness = metallness6;
    shadowMultiColor = shadowColor6;
  }else if (a > .1){
    metalness = metallness7;
    shadowMultiColor = shadowColor7;
  }else{
    metalness = metallness8;
    shadowMultiColor = shadowColor8;
  }
}

float rampUvY;
#if USE_NEW_MAT == 1
void fetchMaterialInfo2(float a, out vec4 shadowMultiColor, out float metalness){
  if (abs(a - 0. / 256.) < 16./256.){
    shadowMultiColor = shadowColor1;
    metalness = metallness1;
    rampUvY = 0. * 0.125 + 0.05;
  }else if (abs(a - 80. / 256.) < 16./256.){
    shadowMultiColor = shadowColor2;
    metalness = metallness2;
    rampUvY = 3. * 0.125 + 0.05;
  }else if (abs(a - 115. / 256.) < 16./256.){
    shadowMultiColor = shadowColor3;
    metalness = metallness3;
    rampUvY = 2. * 0.125 + 0.05;
  }else if (abs(a - 146. / 256.) < 16./256.){
    shadowMultiColor = shadowColor4;
    metalness = metallness4;
    rampUvY = 3. * 0.125 + 0.05;
  }else if (abs(a - 173. / 256.) < 16./256.){
    metalness = metallness5;
    shadowMultiColor = shadowColor5;
    rampUvY = 4. * 0.125 + 0.05;
  }else if (abs(a - 198. / 256.) < 16./256.){
    metalness = metallness6;
    shadowMultiColor = shadowColor6;
    rampUvY = 5. * 0.125 + 0.05;
  }else if (abs(a - 222. / 256.) < 16./256.){
    metalness = metallness7;
    shadowMultiColor = shadowColor7;
    rampUvY = 6. * 0.125 + 0.05;
  }else{
    metalness = metallness8;
    shadowMultiColor = shadowColor8;
    rampUvY = 7. * 0.125 + 0.05;
  }
}
#endif

#if USE_SHADOW_RAMP == 1
vec3 sampleShadowRamp(float id, float shadowRampUV){
  return texture2D(shadowRamp, vec2(shadowRampUV, id+.05)).rgb;  
}

vec3 sampleShadowRamp2(float id, float shadowRampUV){
  return texture2D(shadowRamp, vec2(shadowRampUV, rampUvY)).rgb;  
}
#endif

void calcToonDiffuse(float factor, 
    float vertexAO, 
    float lightmapAO, 
		out float shadowStrength, 
    out float shadowRampUV){

    float D = lightmapAO*vertexAO;

    float threshold = factor;

    if (D < 0.05)
      threshold = 0.;
    else if (D > 0.95)
      threshold = 1.;
    else
      threshold = (factor + D) * 0.5;

    #if USE_SHADOW_RAMP == 1
        shadowStrength = (lightArea - threshold) / lightArea;
        shadowRampUV =  1. - min(shadowStrength/shadowRampWidth, 1.);          
        //shadowStrength = (lightArea - threshold) / shadowTransitionRange;
        shadowStrength = saturate(shadowStrength); // 阴影强度修正
    #endif
}


vec3 fun1(float param1, float param2, float param3){
    vec2 param14 = vec2(param1, param2);
    vec3 param18 = vec3(param14, param3);
    return param18;
}

vec3 fun3(vec3 color){
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(color.bg, K.wz), vec4(color.gb, K.xy), step(color.b, color.g));
    vec4 q = mix(vec4(p.xyw, color.r), vec4(color.r, p.yzx), step(p.x, color.r));	
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 fun4(vec3 hsv){
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(hsv.xxx + K.xyz) * 6.0 - K.www);
    return hsv.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), hsv.y);
}

vec3 fun2(vec3 param4){
    vec3 param9 = fun3(param4);
    
    float param13 = pow(param9.g, .8);
    float param17 = pow(param9.b, 1.1);
    vec3 param19 = fun1(param9.r, param13, param17);
    vec3 param20 = fun4(param19);
    return param20;
}

void main(){
  #if USE_UV2 == 1
    vec2 uv = vNormalAndDiff.z > 0. ? vUv : vUv2;
  #else
    vec2 uv = vUv;
  #endif

  vec3 N = vNormalAndDiff.xyz;

  vec3 H = normalize(lightDir+vViewDir); 
  vec3 diffuseColor = texture2D(diffuse, uv).rgb;


  float dotNL = dot(vViewDir,N);
  
  #if USE_LIGHTMAP > 0
	  vec4 lightTexColor = texture2D(lightMap, uv);
  #else
    vec4 lightTexColor =vec4(0.);
  #endif

  // lightTexColor.r = 1. - lightTexColor.r;
  // lightTexColor.g = 0.;

  #if USE_MATMAP == 1
	  float matTexColor = texture2D(matMap, uv)[MAT_CHANNEL];
  #else
    float matTexColor = 0.;
  #endif

  float shadowStrength = 0.;
  float shadowRampUV = 1.; 
  vec4 shadowColor;
  float metalness;

  #if USE_NEW_MAT == 1
  fetchMaterialInfo2(matTexColor, shadowColor, metalness);
  #else
  fetchMaterialInfo(matTexColor, shadowColor, metalness);
  #endif

  if(vNormalAndDiff.z < 0.){
      N *= -1.;
  }
  #if USE_UV2 == 1
    calcToonDiffuse(abs(vNormalAndDiff.w), vColor.r, lightTexColor.g, shadowStrength, shadowRampUV);
  #else
    calcToonDiffuse(vNormalAndDiff.w, vColor.r, lightTexColor.g, shadowStrength, shadowRampUV);
  #endif
  #if USE_SHADOW_RAMP == 1
    shadowColor.rgb = sampleShadowRamp(matTexColor, shadowRampUV);
  #endif

  #if USE_NEW_MAT == 1
    shadowColor.rgb = sampleShadowRamp2(matTexColor, shadowRampUV);
  #endif

  #if USE_METALMAP == 1
    vec3 viewNormal = mat3(viewMatrix)*N;
    vec2 metalMapUV = viewNormal.xy* 0.5 + 0.5;
    float metalMapValue = texture2D(metalMap, metalMapUV).r;
    vec3 inputMetalLightPartColor = mix(metalDarkColor, metalLightColor, metalMapValue);       
    //vec3 inputMetalLightPartColor = mix(vec3(1.,0.,0.), vec3(1.,1.,0.), metalMapValue);       
    float NoH = max(dot(N, H), .1); 
    float specular = pow(NoH, 20.);
    diffuseColor = mix(diffuseColor, (inputMetalLightPartColor), clamp(lightTexColor.r * lightTexColor.b * metalness * (1.+specular), 0., 1.));
    
  #else
    diffuseColor.rgb += lightTexColor.r * lightTexColor.b * dotNL * .15;
  #endif

 
  float rim = clamp(1.-dotNL,0.,1.);


  #if USE_FACEMAP == 0   
    #if USE_UV2 == 1
      diffuseColor *= shadowColor.rgb*(.8+.2*step(0.,vNormal.z));
    #else
      diffuseColor *= shadowColor.rgb*(.6+.4*step(0.,vNormal.z));
    #endif
  #else
    diffuseColor *= mix(shadowColor.rgb, vec3(1.), lightTexColor.g);
  #endif

  
  vec2 screenUV = gl_FragCoord.xy/resolution;
  float stroke = texture2D(outlineMap,screenUV).a;

  float nol = abs(vNormalAndDiff.w);
  float frontDiff = saturate(nol);
  float viewLerp = saturate((dot(lightDir.xz, vViewDir.xz)*0.5 + 0.5));
  stroke *= (frontDiff)*viewLerp*rimIntensity*.5;
  gl_FragColor = vec4(clamp(stroke+rim*shadowColor.a+diffuseColor,vec3(0.),vec3(1.)),1.);
  gl_FragColor.rgb = fun2(mix(gl_FragColor.rgb,brightness.rgb,smoothstep(0.,.4,brightness.a)*smoothstep(0.,1.-rim,brightness.a)));
  gl_FragColor.rgb *= (1.+exposure); 
  #if USE_FACEMAP == 1
    gl_FragColor.rgb = mix(gl_FragColor.rgb, shadowColor2.rgb, smoothstep(.5,1.,dot(vNormalAndDiff.xyz, vec3(0.,0.,1.)))*smoothstep(.9,1.,vCameraAngle) * lightTexColor.b); 
  #endif

  #if USE_DEPTH > 0
    vec4 faceDepthColor = texture2D(faceDepthMap, gl_FragCoord.xy/resolution);
    float faceWorldDepth = DecodeDepth(faceDepthColor);
    gl_FragColor.a *=  mix(1., clamp((faceWorldDepth - vViewPosition.z)/1200.,0.,1.), vCameraAngle*faceDepthColor.a) * 2.2;
  #endif
  
  #if USE_ALPHA == 1
    vec4 alphaColor = texture2D(alphaMap, uv);
    gl_FragColor.a = alphaColor.r;

  #endif

  #if ALPHA_TEST == 1
  if (gl_FragColor.a < 0.5) {
    discard;
  }
  #endif

  #if HIDE_FLOWER == 1
  if (vColor.g * 100. > 135./255. && vColor.g * 100. < 259./255.) {
   discard;
  }

  //gl_FragColor.rgb = vec3(vColor.g * 100.);
  #endif
}
