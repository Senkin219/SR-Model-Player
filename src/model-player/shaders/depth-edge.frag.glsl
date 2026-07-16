uniform sampler2D diffuse;
uniform vec2 resolution;

const float stroke = 2.;

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


void main(){
  vec2 tc0 = (gl_FragCoord.xy + vec2(-stroke, -stroke))/resolution;
  vec2 tc1 = (gl_FragCoord.xy + vec2(0.0, -stroke))/resolution;
  vec2 tc2 = (gl_FragCoord.xy + vec2(stroke, -stroke))/resolution;
  vec2 tc3 = (gl_FragCoord.xy + vec2(-stroke, 0.0))/resolution;
  vec2 tc4 = (gl_FragCoord.xy)/resolution;
  vec2 tc5 = (gl_FragCoord.xy + vec2(stroke, 0.0))/resolution;
  vec2 tc6 = (gl_FragCoord.xy + vec2(-stroke, stroke))/resolution;
  vec2 tc7 = (gl_FragCoord.xy + vec2(0.0, stroke))/resolution;
  vec2 tc8 = (gl_FragCoord.xy + vec2(stroke, stroke))/resolution;

  
  float strokePower = 0.;
  vec4 col = texture2D(diffuse, tc4);
  if(col.a>0.){
    float d4 = DecodeDepth(col);
    float d0 = DecodeDepth(texture2D(diffuse, tc0));
    float d1 = DecodeDepth(texture2D(diffuse, tc1));
    float d2 = DecodeDepth(texture2D(diffuse, tc2));
    float d3 = DecodeDepth(texture2D(diffuse, tc3));
    float d5 = DecodeDepth(texture2D(diffuse, tc5)); 
    float d6 = DecodeDepth(texture2D(diffuse, tc6));
    float d7 = DecodeDepth(texture2D(diffuse, tc7));
    float d8 = DecodeDepth(texture2D(diffuse, tc8));
    
    float sum =  abs((d0 + d1 + d2 + d3 + d5 + d6 + d7 + d8)-8.0 * d4);
    strokePower = step(10.,sum);
  }
 
 gl_FragColor = vec4(strokePower);
}
