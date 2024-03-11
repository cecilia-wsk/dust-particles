varying vec2 vUv;
varying vec4 vColor;
uniform sampler2D uPositions;
uniform float uTime;
uniform vec4 uResolution;

void main() {
  vUv = uv;
  vec4 pos = texture2D(uPositions, uv);
  
  float angle = atan(pos.y, pos.x);
  vColor = vec4(0.4 + 0.35 * sin(angle+uTime*0.8));

  vec4 mvPosition = modelViewMatrix * vec4( pos.xyz, 1. );
  //gl_PointSize = .25 * ( 1. / - mvPosition.z );
  
  // Calculate particle size
  float particleSize = 0.15; // Adjust this formula as needed
  // Adjust particle size based on screen resolution
  particleSize *= min(uResolution.a, uResolution.b)/min(16.,9.);
  // Set gl_PointSize
  gl_PointSize = particleSize;
  
  gl_Position = projectionMatrix * mvPosition;
}
