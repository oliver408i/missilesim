import * as THREE from 'three';
import global from "./variableHandler.js";
import { Fire } from "./lib/THREEFire.js";

export function initMainMenu() {

    // Wait for model to finish loading
    const w = setInterval(function() {
        console.log(global.missileModel);
        if (global.missileModel != undefined) {
            global.missileModel.layers.set(0);
            global.missileModel.position.set(0,0,0);
            clearInterval(w);
        }
    },100);

    global.flame = new Fire( new THREE.TextureLoader().load("assets/fire.png"), new THREE.CylinderGeometry(1,1,1));
    global.flame.scale.set(0.3,2,0.3);
    global.flame.rotation.set(Math.PI/2,0,0);
    global.flame.position.setZ(2.3);
    global.scene.add(global.flame);

    console.log(global.flame.material.uniforms);

    global.camera.position.set(-5,5,10);
    global.camera.lookAt(0,0,0);
    global.camera.position.setX(-10);
    global.camera.position.setZ(5);
    

    

    mainMenuAnimation();

}

function genRandomPos(threshold) {
    // Negative or positive
    const sign = Math.random() > 0.5 ? 1 : -1;
    threshold = sign * threshold;
    return new THREE.Vector3(Math.random()*threshold, Math.random()*threshold, Math.random()*threshold);
}

let angle = 0;
const radius = 1; // Radius of the circle

function mainMenuAnimation() {
    global.mainMenuAnimation = requestAnimationFrame(mainMenuAnimation);

    
    global.camera.position.x = -5+radius * Math.cos(angle);
    global.camera.position.y = 5+radius * Math.sin(angle);
    global.flame.update(global.clock.getElapsedTime()*5);
    angle += 0.01
    global.renderer.render(global.scene, global.camera);
}