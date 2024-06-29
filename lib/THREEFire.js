import * as THREE from 'three';

const THREEFireShader = {
  defines: window.THREEFireShader.defines,
  uniforms: {
    fireTex: { value: null },
    color: { value: new THREE.Color(0xffffff) },
    invModelMatrix: { value: new THREE.Matrix4() },
    scale: { value: new THREE.Vector3(1, 1, 1) },
    seed: { value: Math.random() * 19.19 },
    time: { value: 0.0 },
    magnitude: { value: 0.2 },
    lacunarity: { value: 5.0 },
    gain: { value: 0 },
    noiseScale: { value: new THREE.Vector4(1, 2, 1, 0.3) }
  },
  vertexShader: window.THREEFireShader.vertexShader,
  fragmentShader: window.THREEFireShader.fragmentShader
};

export class Fire extends THREE.Mesh {
  constructor(fireTex, geometry, color) {
    const fireMaterial = new THREE.ShaderMaterial({
      defines: THREEFireShader.defines,
      uniforms: THREE.UniformsUtils.clone(THREEFireShader.uniforms),
      vertexShader: THREEFireShader.vertexShader,
      fragmentShader: THREEFireShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });

    // initialize uniforms
    fireTex.magFilter = fireTex.minFilter = THREE.LinearFilter;
    fireTex.wrapS = fireTex.wrapT = THREE.ClampToEdgeWrapping;

    fireMaterial.uniforms.fireTex.value = fireTex;
    fireMaterial.uniforms.color.value = color || new THREE.Color(0xeeeeee);

    super(geometry, fireMaterial);
  }

  update(time) {
    const invModelMatrix = this.material.uniforms.invModelMatrix.value;

    this.updateMatrixWorld(true);

    invModelMatrix.copy(this.matrixWorld).invert();

    if (time !== undefined) {
      this.material.uniforms.time.value = time;
    }

    this.material.uniforms.invModelMatrix.value = invModelMatrix;
    this.material.uniforms.scale.value = this.scale;
  }
}
