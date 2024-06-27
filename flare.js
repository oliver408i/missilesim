import * as THREE from 'three';
import { createThermalShaderMaterial } from './thermalShader.js';
export class Flare {
    constructor(scene, position) {
        this.heat = 200;
        this.scene = scene;
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32), createThermalShaderMaterial(this.heat));
        this.mesh.position.copy(position);
        this.scene.add(this.mesh);
        const speedMultiplier = 10; // Adjust the speed of the flare as needed
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * speedMultiplier,
            (Math.random() - 0.5) * speedMultiplier,
            (Math.random() - 0.5) * speedMultiplier
        ); // Random direction

    }

    update(deltaTime) {
        this.heat -= deltaTime * 50; // Adjust the rate of heat decrease as needed
        if (this.heat <= 0) {
            this.scene.remove(this.mesh);
            return false; // Signal that the flare should be removed
        } else {
            this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime)); // Update position based on velocity

            this.mesh.material.uniforms.heat.value = this.heat;


            return true; // Signal that the flare is still active
        }
    }
}