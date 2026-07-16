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

varying vec3 vNormal;

void main(){
  vNormal = normalize(normalMatrix * normal);
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
  gl_Position.z = log2( max( 0.000001, gl_Position.w + 1.0 ) ) * 0.18237350163834035 - 1.0;
gl_Position.z *= gl_Position.w;

}
