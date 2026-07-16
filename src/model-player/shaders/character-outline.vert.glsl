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

const vec3 outlineWidthAdjustZs = vec3(0.01, 150., 200.);
const vec3 outlineWidthAdjustScales = vec3(0.105, 0.2, .3);

//const vec4 outlineWidthAdjustZs = vec4(0.01, 2., 6., 0.);
//const vec4 outlineWidthAdjustScales = vec4(0.105, 0.245, 0.6, 0.);

float lerpByZ(float startScale, float endScale, float startZ, float endZ, float z){
	float t = (z - startZ) / max(endZ - startZ, 0.001);
	t = clamp(t,0.,1.);
	return mix(startScale, endScale, t);
}

float outlineOffset(float z, float s){
	float fovScale = projectionMatrix[1][1];
	z *= 2.414 / fovScale; 
	vec2 zRange, scales;
	if (z < outlineWidthAdjustZs.y){
		zRange = outlineWidthAdjustZs.xy;
		scales = outlineWidthAdjustScales.xy;
	}else{
		zRange = outlineWidthAdjustZs.yz;
		scales = outlineWidthAdjustScales.yz;
	}
	float scale = lerpByZ(scales.x, scales.y, zRange.x, zRange.y, z);
  return scale*s*1.4;
}

attribute vec4 color;
attribute vec4 color2;

varying vec2 vUv;
varying vec3 vViewDir;
varying vec3 vNormal;
varying vec3 vColor;

varying vec4 vViewPosition;
varying float vCameraAngle;

void main(){
    vUv = uv;
    vColor = color2.rgb;
    vec3 objectNormal = color.xyz*2. - 1.;
    vec3 transformedNormal = normal;

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

      vec3 transformed = position;
        
      #ifdef USE_MORPH
        transformed += ( morphTarget0 ) * morphTargetInfluences[ 0 ];
        transformed += ( morphTarget1 ) * morphTargetInfluences[ 1 ];
        transformed += ( morphTarget2 ) * morphTargetInfluences[ 2 ];
        transformed += ( morphTarget3 ) * morphTargetInfluences[ 3 ];
        #if USE_MORPH > 4
          transformed += ( morphTarget4 ) * morphTargetInfluences[ 4 ];
        #endif
      #endif      
      
      vec3 dirNormal = normalize(normalMatrix * (skinMatrix * vec4(0.,0.,1.,0.)).xyz);
      objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;

      transformedNormal = vec4( skinMatrix * vec4( normal, 0.0 ) ).xyz;
     
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

    vViewPosition = modelViewMatrix * (vec4(transformed,1.));    
    vViewDir = normalize(-vViewPosition.xyz);
    
    vec3 N = normalize(normalMatrix * objectNormal);

    vNormal = normalize (normalMatrix * transformedNormal);

    N.z = 0.001;
		N = normalize(N);

    vec4 newViewPosition = vViewPosition;
   
    vCameraAngle = smoothstep(.5,1.,dot(vec3(0.,0.,1.), dirNormal));
    

    #if SIMPLE_MODE == 2
      float offset = outlineOffset(-newViewPosition.z , color2.a)* color2.r;
      newViewPosition.xyz += normalize(newViewPosition.xyz) * 2.* color2.r;    
    #else
      float offset = outlineOffset(-newViewPosition.z , color2.a);

      newViewPosition.xyz += normalize(newViewPosition.xyz)*.1;    
    #endif
   
   
    newViewPosition.xy += N.xy * offset;   

    vViewPosition = newViewPosition;

    gl_Position = projectionMatrix * newViewPosition;

    gl_Position.z = log2( max( 0.000001, gl_Position.w + 1.0 ) ) * 0.18237350163834035 - 1.0;
gl_Position.z *= gl_Position.w;

}
