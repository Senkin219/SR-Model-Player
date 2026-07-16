varying vec4 vViewPosition;
#ifdef USE_FACEMAP
  uniform sampler2D diffuse;
  varying vec2 vUv;
#endif
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

varying vec3 vColor;

void main () {
		float t =  -(vViewPosition.z);
		gl_FragColor = EncodeDepth(t);
    #ifdef USE_FACEMAP
      gl_FragColor *= texture2D(diffuse, vUv).g;
    #endif

    #if HIDE_FLOWER == 1
    if (vColor.g * 100. > 125./255. && vColor.g * 100. < 259./255.) {
      discard;
    }
    #endif
}
