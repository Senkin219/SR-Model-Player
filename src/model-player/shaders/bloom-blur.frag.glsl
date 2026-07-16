uniform vec2 resolution;
uniform float blur;
uniform sampler2D diffuse;

void main()
{
    float lod = blur*2.;
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 col = texture2D( diffuse, uv + vec2( blur, blur ) / resolution,lod );
    col += texture2D( diffuse, uv + vec2( blur, -blur ) / resolution ,lod);
    col += texture2D( diffuse, uv + vec2( -blur, blur ) / resolution ,lod);
    col += texture2D( diffuse, uv + vec2( -blur, -blur ) / resolution ,lod);
    gl_FragColor = col/4.0;//
}
