import * as THREE from 'three';

const vertexShader = `
varying float vHeat;
uniform float heat;
void main() {
  vHeat = heat;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
varying float vHeat;
void main() {
  float heat = vHeat / 100.0; // Normalize heat value
  vec3 color = vec3(heat); // Color mapping (black to white)
  gl_FragColor = vec4(color, 1.0);
}
`;

export const createThermalShaderMaterial = (heatValue) => new THREE.ShaderMaterial({
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  uniforms: {
    heat: { value: heatValue }
  }
});