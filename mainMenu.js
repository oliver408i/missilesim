import * as THREE from 'three';
import global from "./variableHandler.js";
import { Fire } from "./lib/THREEFire.js";

export function initMainMenu() {

    // Wait for model to finish loading
    const w = setInterval(function() {
        console.log(global.missileModel);
        if (global.missileModel != undefined) {
            global.missileModel.layers.set(0);
            global.missileModel.position.set(0,0,-2);
            clearInterval(w);

            global.flame = new Fire( new THREE.TextureLoader().load("assets/fire.png"), new THREE.CylinderGeometry(1,1,1));
            global.flame.scale.set(0.3,2,0.3);
            global.flame.rotation.set(Math.PI/2,0,0);
            global.flame.position.setZ(1.6);
            global.scene.add(global.flame);

            console.log(global.flame.material.uniforms);

            global.camera.position.set(-5,5,10);
            global.camera.lookAt(0,0,0);
            global.camera.position.setX(-10);
            global.camera.position.setZ(5);

            mainMenuAnimation();
        }
    },100);

}

let angle = 0;
const radius = 1; // Radius of the circle

function mainMenuAnimation() {
    
    global.mainMenuAnimation = requestAnimationFrame(mainMenuAnimation);
    global.stats.begin();

    global.camera.position.x = -5+(Math.sin(angle) * Math.PI/2)/2;
    global.camera.position.y = 5+(Math.cos(angle) * Math.PI/2)/2;
    global.flame.update(global.clock.getElapsedTime()*5);
    angle += Math.PI/200;

    if (global.missileModel) {
        global.missileModel.rotation.z = Math.sin(angle) * Math.PI/4;
    }
    global.renderer.render(global.scene, global.camera);

    global.stats.end();
}