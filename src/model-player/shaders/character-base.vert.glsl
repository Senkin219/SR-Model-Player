#include <skinning_pars_vertex>

#ifdef USE_MORPH
  attribute vec3 morphTarget0;
  attribute vec3 morphTarget1;
  attribute vec3 morphTarget2;
  attribute vec3 morphTarget3;
  #if USE_MORPH > 4
    attribute vec3 morphTarget4;
  #endif
  uniform float morphTargetInfluences[ USE_MORPH ];
#endif

uniform mat3 inverseNormalMatrix;

uniform vec3 lightDir;

float diffuseFactor(vec3 N, vec3 L){
	return dot(N, L) * 0.4975 + 0.5;
}

attribute vec4 color2;

varying vec2 vUv;
#if USE_UV2 == 1
attribute vec2 uv2;
varying vec2 vUv2;
#endif
varying vec4 vNormalAndDiff;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec4 vViewPosition;
varying float vCameraAngle;
varying vec3 vColor;

#if USE_NORMAL2 == 1
attribute vec3 normal2;
#endif

void main(){
    vColor = color2.rgb;
    #if USE_UV2 == 1
      vUv2 = uv2;
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

      #if USE_NORMAL2 == 1
        vec3 objectNormal = vec4( skinMatrix * vec4( normal2, 0.0 ) ).xyz;
      #else
        vec3 objectNormal = vec4( skinMatrix * vec4( normal, 0.0 ) ).xyz;
      #endif

      vec3 dirNormal = normalize(normalMatrix * (skinMatrix * vec4(0.,0.,1.,0.)).xyz);
      vNormalAndDiff = vec4(normalize(normalMatrix * objectNormal), 0.);
      // calc light normal
      vNormalAndDiff.w = diffuseFactor(vNormalAndDiff.xyz, lightDir);
        
      vec3 transformed = vec3( position );
        
      #ifdef USE_MORPH
        transformed += ( morphTarget0 ) * morphTargetInfluences[ 0 ];
        transformed += ( morphTarget1 ) * morphTargetInfluences[ 1 ];
        transformed += ( morphTarget2 ) * morphTargetInfluences[ 2 ];
        transformed += ( morphTarget3 ) * morphTargetInfluences[ 3 ];
        #if USE_MORPH > 4
          transformed += ( morphTarget4 ) * morphTargetInfluences[ 4 ];
        #endif
      #endif
      
      vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
      vec4 skinned = vec4( 0.0 );
      skinned += boneMatX * skinVertex * skinWeight.x;
      skinned += boneMatY * skinVertex * skinWeight.y;
      skinned += boneMatZ * skinVertex * skinWeight.z;
      skinned += boneMatW * skinVertex * skinWeight.w;
      transformed = ( bindMatrixInverse * skinned ).xyz;

      vNormal = normalMatrix * (skinMatrix * vec4(normal,0.)).xyz;
    #else
      vNormalAndDiff = vec4(normalMatrix * normal, 0.);
      vNormal = vNormalAndDiff.xyz;
      vNormalAndDiff.w = diffuseFactor(vNormalAndDiff.xyz, lightDir);
      vec3 dirNormal = vNormalAndDiff.xyz;
      vec3 transformed = vec3( position );
    #endif

    vUv = uv;

    vViewPosition = modelViewMatrix * vec4(transformed , 1.);
    vViewDir = normalize(-vViewPosition.xyz);
    vCameraAngle = smoothstep(.5,1.,dot(vec3(0.,0.,1.), dirNormal));
    
    gl_Position = projectionMatrix * vViewPosition;

    gl_Position.z = log2( max( 0.000001, gl_Position.w + 1.0 ) ) * 0.18237350163834035 - 1.0;
gl_Position.z *= gl_Position.w;

}
