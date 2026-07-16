varying vec4 vViewPosition;
#include <skinning_pars_vertex>

#ifdef USE_MORPH
  attribute vec3 morphTarget0;
  attribute vec3 morphTarget1;
  attribute vec3 morphTarget2;
  attribute vec3 morphTarget3;
  uniform float morphTargetInfluences[ 4 ];
#endif

#ifdef USE_FACEMAP
  varying vec2 vUv;
#endif
attribute vec4 color2;
varying vec3 vColor;

void main(){ 
    vColor = color2.rgb;
    #ifdef USE_FACEMAP
      vUv = uv;
    #endif

    #ifdef USE_SKINNING
      mat4 boneMatX = getBoneMatrix( skinIndex.x );
      mat4 boneMatY = getBoneMatrix( skinIndex.y );
      mat4 boneMatZ = getBoneMatrix( skinIndex.z );
      mat4 boneMatW = getBoneMatrix( skinIndex.w );
      
      mat4 skinMatrix = mat4( 0.0 );
      skinMatrix += skinWeight.x * boneMatX;
      skinMatrix += skinWeight.y * boneMatY;
      skinMatrix += skinWeight.z * boneMatZ;
      skinMatrix += skinWeight.w * boneMatW;
      skinMatrix  = bindMatrixInverse * skinMatrix * bindMatrix;
        
      vec3 transformed = vec3( position );

      #ifdef USE_MORPH
        transformed += ( morphTarget0 - position ) * morphTargetInfluences[ 0 ];
        transformed += ( morphTarget1 - position ) * morphTargetInfluences[ 1 ];
        transformed += ( morphTarget2 - position ) * morphTargetInfluences[ 2 ];
        transformed += ( morphTarget3 - position ) * morphTargetInfluences[ 3 ];
      #endif
      
      vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
      vec4 skinned = vec4( 0.0 );
      skinned += boneMatX * skinVertex * skinWeight.x;
      skinned += boneMatY * skinVertex * skinWeight.y;
      skinned += boneMatZ * skinVertex * skinWeight.z;
      skinned += boneMatW * skinVertex * skinWeight.w;
      transformed = ( bindMatrixInverse * skinned ).xyz;
    #else
      vec3 transformed = vec3( position );
    #endif
    
    vViewPosition = modelViewMatrix * vec4(transformed , 1.);
    gl_Position = projectionMatrix *  vViewPosition;
     gl_Position.z = log2( max( 0.000001, gl_Position.w + 1.0 ) ) * 0.18237350163834035 - 1.0;
gl_Position.z *= gl_Position.w;

}
