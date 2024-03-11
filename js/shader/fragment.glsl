uniform sampler2D imageTexture;
uniform float uTime;
uniform vec4 uResolution;
varying vec2 vUv;
varying vec4 vColor;

void main()	{
	vec2 newUV = (vUv - vec2(0.5))*uResolution.zw + vec2(0.5);
	//newUV.x += 0.02*sin(newUV.y*20. + time);
	
	//gl_FragColor = vColor;
	gl_FragColor = vec4( 1., 1., 1., .8);
	//gl_FragColor = vec4( 0.+cos(uTime*0.2), .5+cos(uTime*0.5), 1.+cos(uTime*0.1), .8);
}