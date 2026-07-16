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

varying vec3 vNormal;
varying vec3 vViewDir;
uniform sampler2D diffuse;
uniform vec2 resolution;
varying vec2 vUv;

void main() {
  vec2 uv = gl_FragCoord.xy/resolution;
  float z = smoothstep(0.,.8,1.-dot(vNormal, vViewDir));
  vec4 color = texture2D(diffuse,uv );
  float fade = smoothstep(0.85,1.,1.-2.*length(vUv-.5));
  gl_FragColor = vec4(color.rgb,color.a*z*fade*.4);
  
  //gl_FragColor = mix(gl_FragColor,vec4(1.,1.,1.,.5*fade),fade);
}
