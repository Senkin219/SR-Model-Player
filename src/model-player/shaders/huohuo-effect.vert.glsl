#if USE_TEXTURE == 1
  varying vec2 vUv;
#endif

#ifdef USE_INSTANCE
  attribute vec4 rotation;
  attribute vec3 offset;
  attribute vec3 scale;
#endif

#include <skinning_pars_vertex>

#ifdef USE_MORPH
  attribute vec3 morphTarget0;
  attribute vec3 morphTarget1;
  attribute vec3 morphTarget2;
  attribute vec3 morphTarget3;
  uniform float morphTargetInfluences[ 4 ];
#endif

uniform float time;
uniform sampler2D noise_1;
uniform sampler2D noise_2;
uniform sampler2D mask;

void main(){
  #if USE_TEXTURE == 1
    vUv = uv;
  #endif

  #ifdef USE_INSTANCE
    vec3 scaledPosition = position*scale;
    vec3 transformed = (scaledPosition + 2.0 * cross(rotation.xyz, cross(rotation.xyz, scaledPosition) + rotation.w * scaledPosition))+offset;
  #else
    #include <beginnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>

    #include <begin_vertex>
    
    #ifdef USE_MORPH
      transformed += ( morphTarget0 - position ) * morphTargetInfluences[ 0 ];
      transformed += ( morphTarget1 - position ) * morphTargetInfluences[ 1 ];
      transformed += ( morphTarget2 - position ) * morphTargetInfluences[ 2 ];
      transformed += ( morphTarget3 - position ) * morphTargetInfluences[ 3 ];
    #endif
    #include <skinning_vertex>
  #endif
  #include <project_vertex>


  vec4 maskColor = texture2D(mask, vUv);
  vec4 noiseColor1 = texture2D(noise_2, vUv * 0.175 + time * 0.15);
  mvPosition.y += (noiseColor1.r - 0.5) * 20. * (1. - pow(vUv.x, 1.8)) * transformedNormal.y;
  mvPosition.x += (noiseColor1.r - 0.5) * 20. * (1. - pow(vUv.x, 1.8)) * transformedNormal.x;
  gl_Position = projectionMatrix * mvPosition;

  gl_Position.z = log2( max( 0.000001, gl_Position.w + 1.0 ) ) * 0.18237350163834035 - 1.0;
gl_Position.z *= gl_Position.w;

}
