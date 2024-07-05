import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import * as TWEEN from './lib/tween.esm.js';

import { createThermalShaderMaterial } from './thermalShader.js';
import { Flare } from './flare.js';
import global from './variableHandler.js';
import { addMarkerToSphere } from './irccm.js';

import * as INIT from './init.js';
import { initMainMenu } from './mainMenu.js';

INIT.init();

const infoText = document.getElementById('info');
const scene = global.scene;
const camera = global.camera;
const renderer = global.renderer;
const clock = global.clock;
const raycaster = new THREE.Raycaster();


renderer.setSize(window.innerWidth, window.innerHeight);

// Parameters for bloom effect
const bloomParams = {
    exposure: 1.5,
    bloomStrength: 7,
    bloomThreshold: 0.49,
    bloomRadius: 0.5
};


// Create renderPass
const renderPass = new RenderPass(scene, camera);

const defaultBloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    bloomParams.bloomStrength,
    bloomParams.bloomRadius,
    bloomParams.bloomThreshold
);


const composer = new EffectComposer(renderer);

composer.addPass(renderPass);
composer.addPass(defaultBloomPass);

const flares = [];
const outlines = [];

function createFlare(position) {
    const flare = new Flare(scene, position);
    flares.push(flare);
    if (global.missileSpecs.irccmMode === 'outliner') {
        addMarkerToSphere(scene, outlines, flare);
    }

}

function checkIntersections() {
    // Do not use rangefinder until at least 100 ms has passed
    if (clock.getElapsedTime() < 0.1) {
      return;
    }
    // Set the raycaster from the camera's position and direction
    raycaster.set(camera.position, camera.getWorldDirection(new THREE.Vector3()));
    raycaster.camera = camera;

    // Define the range of the raycaster
    const range = 100;
    raycaster.far = range;

    // Get the list of objects the ray intersects
    const intersects = raycaster.intersectObjects(scene.children);

    const rangefinder = document.getElementById('rangefinder');

    if (intersects.length > 1) {
      rangefinder.innerText = intersects[1].distance.toFixed(2);

      if (global.missileSpecs.proxyFuse === "laser" && intersects[1].distance < global.missileSpecs.proxyFuseDistance) {
        explode();
      }
    } else {
      rangefinder.innerText = '--';
    }
}

window.addEventListener('message', (event) => {
    if (event.data == "startGame") {
        global.missileSpecs = JSON.parse(localStorage.getItem('missileSpecs'));
        global.difficultyData = JSON.parse(localStorage.getItem('difficultyData'));
        global.miscSettings = JSON.parse(localStorage.getItem('miscSettings'));
        INIT.hideMainMenu();
        INIT.initText();
        startGame();
    } else if (event.data == "grabNewShowFPSSetting") {
        const showFPS = localStorage.getItem('showFPS');
        if (showFPS != "None") {
            global.stats.domElement.style.display = 'block';
            global.stats.showPanel(parseInt(showFPS));
        } else {
            global.stats.domElement.style.display = 'none';
        }
    }
})

function explode() {
    infoText.innerText = infoText.innerText+"\nWarhead Activated"
    let distance = camera.position.distanceTo(target.position);
    if (distance < distanceThreshold) {
        document.getElementById('gameOver').innerText = 'HIT: ' + distance.toFixed(2) + 'm';
        document.getElementById('gameOver').style.display = 'block';
        cancelAnimationFrame(id); // Stop the animation

        setTimeout(() => {
            // Visualize the final position of the missile and target
            const positionMarker = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshLambertMaterial({color: 0xFFA500}));
            positionMarker.position.copy(camera.position);
            scene.add(positionMarker);
            
            positionMarker.layers.set(1);

            
            global.missileModel.position.copy(positionMarker.position);
            
            // Copy rotation data from camera to the model
            global.missileModel.rotation.copy(camera.rotation);

            const offset = new THREE.Vector3(0, 0, 50);
            offset.applyQuaternion(global.missileModel.quaternion);

            global.missileModel.position.add(offset);
            
            global.missileModel.layers.set(0);

            // Draw the edges of the cube
            const edges = new THREE.EdgesGeometry(target.geometry);
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
            const lines = new THREE.LineSegments(edges, lineMaterial);
            lines.position.copy(target.position);
            lines.rotation.copy(target.rotation);
            scene.add(lines);

            

            


            sprite.layers.set(1); // Hide it
            radarBox.layers.set(1);

            for (let i = 0; i < flares.length; i++) {
                flares[i].mesh.layers.set(1);
            }

            for (let i = 0; i < outlines.length; i++) {
                outlines[i].layers.set(1);
            }
            

            let controls = undefined;

            let tween = new TWEEN.Tween(global.missileModel.position)
                .to(positionMarker.position, 2000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onUpdate(() => {
                    global.camera.lookAt(global.missileModel.position);
                    global.camera.position.copy(global.missileModel.position);
                    global.camera.position.add(new THREE.Vector3(5, 20, -5));
                })
                .start();

            setTimeout(() => {
                // Draw a line from the position marker to the target cube
                const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([positionMarker.position, target.position]), new THREE.LineBasicMaterial({ color: 0xFFA500}));
                scene.add(line);
                positionMarker.layers.set(0);

                controls = new OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true; // Enable damping (inertia)
                controls.dampingFactor = 0.25; // Damping factor
                controls.enablePan  = false; // Disable panning

                controls.autoRotate = true;

                controls.target = target.position;

                controls.minDistance = Math.round(distance)+5;
                controls.maxDistance = controls.minDistance + 10;
            }, 2000);
            
            function endGameAnimation(time) {
                
                global.stats.begin();

                if (tween != undefined) {
                    tween.update(time);
                }
                if (controls) { controls.update(); }
                renderer.render(scene, camera);

                global.stats.end();

                requestAnimationFrame(endGameAnimation);
            }

            requestAnimationFrame(endGameAnimation);
        },200);
        
        
    } else {
        document.getElementById('gameOver').innerText = 'Game Over: Too Far! ' + distance.toFixed(2) + 'm';
        document.getElementById('gameOver').style.display = 'block';
        cancelAnimationFrame(id); // Stop the animation
    }
}

function isCameraNearTerrain(camera, terrainMesh, threshold = 2) {
    const raycaster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    raycaster.set(camera.position, down);
    const intersects = raycaster.intersectObject(terrainMesh);
    if (intersects.length > 0 && intersects[0].distance < threshold) {
        return true;
    }
    return false;
}

function isMeshVisible(camera, mesh) {
    // Create a frustum
    const frustum = new THREE.Frustum();
    
    // Create a matrix to transform the camera view
    const cameraViewProjectionMatrix = new THREE.Matrix4();
    
    // Update the camera matrix
    camera.updateMatrixWorld(); // ensure camera matrix is up to date
    cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    
    // Set the frustum from the camera matrix
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);
    
    // Get the bounding box of the mesh
    const meshBoundingBox = new THREE.Box3().setFromObject(mesh);
    
    // Check if the mesh is intersecting with the frustum
    return frustum.intersectsBox(meshBoundingBox);
}

function checkDistanceToTarget(timeDelta) {
    if (!isMeshVisible(camera, target) && camera.position.distanceTo(target.position) > distanceThreshold) {
        if (meshNotVisibleFor > global.difficultyData.missThreshold) {
            document.getElementById('gameOver').innerText = 'Game Over: Missed Target';
            document.getElementById('gameOver').style.display = 'block';
            cancelAnimationFrame(id); // Stop the animation
        } else {
            meshNotVisibleFor += timeDelta;
        }
        
    } else {
        meshNotVisibleFor = 0;
    }
    if (global.missileSpecs.proxyFuse === 'autoTargetting') {
        if (camera.position.distanceTo(target.position) < global.missileSpecs.proxyFuseDistance) {
            explode();
        }
    }

    if (isCameraNearTerrain(camera, global.terrainMesh)) {
        document.getElementById('gameOver').innerText = 'Game Over: Crashed into Terrain';
        document.getElementById('gameOver').style.display = 'block';
        cancelAnimationFrame(id); // Stop the animation
    }
}

function updateTargetRotation() {
    targetRotation.set(
      Math.random() * 2 * Math.PI, // Randomize X-axis rotation
      target.rotation.y,              // Keep Y-axis rotation constant
      Math.random() * 2 * Math.PI  // Randomize Z-axis rotation
    );
    // Generate random velocity changes for target from +- 0.5
    const vChange = new THREE.Vector3(
      Math.random() * 1 - 0.5,
      0,
      Math.random() * 1 - 0.5
    );

    targetVelocity.add(vChange);

    // Max velocity is 1
    targetVelocity.set(
      THREE.MathUtils.clamp(targetVelocity.x, -1, 1),
      THREE.MathUtils.clamp(targetVelocity.y, -1, 1),
      THREE.MathUtils.clamp(targetVelocity.z, -1, 1)
    )
}

function radarUpdate() {
    const vector = new THREE.Vector3();
    target.getWorldPosition(vector);

    vector.project(camera);

    radarBox.position.set(vector.x, vector.y, -1);
}

let target;
let distanceThreshold;
let id;
let targetRotation;
let targetVelocity;
let sprite;
let radarBox;
let meshNotVisibleFor = 0;

function startGame() {
    

    // sleep 100 ms
    setTimeout(() => {
        cancelAnimationFrame(global.mainMenuAnimation);
    }, 100);

    global.camera.position.set(0,0,0);
    global.camera.rotation.set(0,0,0);

    const cubeGeometry = new THREE.BoxGeometry();
    const cubeMaterial = createThermalShaderMaterial(100); // Initial heat value
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.x = 0;
    scene.add(cube);

    distanceThreshold = global.difficultyData.distanceThreshold; // Adjust this value as needed
    target = cube
    const targetDistance = global.difficultyData.targetDistance; // Distance in front of the camera
    const targetRange = targetDistance/2; // Range within which the target can be placed around the center



    // Calculate a random position in front of the camera
    const randomX = (Math.random() - 0.5) * targetRange;
    const randomY = (Math.random() - 0.5) * targetRange;
    const randomZ = -targetDistance; // In front of the camera

    // Apply the random position relative to the camera's current position and orientation
    const targetPosition = new THREE.Vector3(randomX, randomY, randomZ).applyQuaternion(camera.quaternion);
    target.position.copy(camera.position.clone().add(targetPosition));





    camera.position.z = 5;

    // For updating heat value
    let heatDirection = 0.5;
    let heatValue = 100;
    let timer = 0;

    targetVelocity = new THREE.Vector3(0,0,-0.5);
    const moveSpeed = 1.5;
    targetRotation = new THREE.Vector3();


    

    let targetRotationX = 0;
    let targetRotationY = 0;
    let targetRotationZ = 0;
    const rotationSpeed = 0.05; // Adjust this value for smoother/slower or quicker turning

    const keyState = {};

    document.addEventListener('keydown', (event) => {
        keyState[event.key] = true;
    }, false);

    document.addEventListener('keyup', (event) => {
        keyState[event.key] = false;
    }, false);

    const radarBoxMaterial = new THREE.SpriteMaterial({ map:  new THREE.TextureLoader().load('assets/radarbox.png')});
    radarBox = new THREE.Sprite(radarBoxMaterial);
    // Position the sprite in front of the camera
    radarBox.position.set(0, 0, -1);
    radarBox.scale.set(0.1,0.1,0.1);
    if (global.missileSpecs.irccmMode === "radar") {
        radarBox.layers.set(0);
    } else {
        radarBox.layers.set(1);
    }
    camera.add(radarBox); // Add sprite to the camera
    
    const spriteMaterial = new THREE.SpriteMaterial({ map:  new THREE.TextureLoader().load('assets/'+global.missileSpecs.sightImage+'.png')});
    sprite = new THREE.Sprite(spriteMaterial);
    // Position the sprite in front of the camera
    sprite.position.set(0, 0, -1);
    sprite.scale.set(1.5,1.5, 1);
    sprite.layers.set(0);
    camera.add(sprite); // Add sprite to the camera
    scene.add(camera);

    let currentV = targetVelocity;
    

    function animate() {
        id = requestAnimationFrame(animate);

        global.stats.begin();

        // Update heat value
        heatValue += heatDirection;
        if (heatValue > 85) {
            heatValue = 85;
            heatDirection = -0.5;
        } else if (heatValue < 50) {
            heatValue = 50;
            heatDirection = 0.5;
        }

        // Apply heat value to objects
        cube.material.uniforms.heat.value = heatValue;

        const turnSpeed = 0.02;

            if (keyState['w']) {
                if (global.miscSettings.controlMode == "2") {
                    targetRotationX -= turnSpeed;
                } else {
                    targetRotationX += turnSpeed;
                }
            }
            if (keyState['s']) {
                if (global.miscSettings.controlMode == "2") {
                    targetRotationX += turnSpeed;
                } else {
                    targetRotationX -= turnSpeed;
                }
            }
            if (keyState['a']) {
                targetRotationY += turnSpeed;
            }
            if (keyState['d']) {
                targetRotationY -= turnSpeed;
            }
            if (keyState['q'] && parseInt(global.miscSettings.controlMode) > 0) {
                targetRotationZ += turnSpeed;
            }
            if (keyState['e'] && parseInt(global.miscSettings.controlMode) > 0) {
                targetRotationZ -= turnSpeed;
            }
            if (keyState[' ']) {
                explode();
            }

            const currentQuat = camera.quaternion.clone();
            const targetQuatX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), targetRotationX);
            const targetQuatY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetRotationY);
            const targetQuat = new THREE.Quaternion().multiplyQuaternions(targetQuatY, targetQuatX);

            currentQuat.slerp(targetQuat, rotationSpeed);
            camera.quaternion.copy(currentQuat);
            if (parseInt(global.miscSettings.controlMode) > 0) camera.rotation.z += (targetRotationZ - camera.rotation.z) * rotationSpeed;

            // Move the camera forward
            let direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(camera.quaternion);
            camera.position.addScaledVector(direction, moveSpeed);

            const deltaTime = clock.getDelta();

            // Check the distance to the target
            checkDistanceToTarget(deltaTime);

            if (global.missileSpecs.irccmMode === 'radar') {
                radarUpdate();
            }

            
            // Randomly create flares from the target's position in clusters of 1 - flareCount
            if (Math.random() < 0.02) {
                const flareCountCeiling = global.difficultyData.flareCount;
                const numFlares = Math.floor(Math.random() * flareCountCeiling) + 1;
                for (let i = 0; i < numFlares; i++) {
                    createFlare(target.position);
                }
            }
            

            

            timer += deltaTime;

            if (timer >= 2) {
                updateTargetRotation();
                new TWEEN.Tween(currentV)
                .to(targetVelocity, 1500)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .start();
                timer = 0;
            }

            

            target.position.add(currentV);
            
            // Update each flare and remove it if it has no heat left
            for (let i = flares.length - 1; i >= 0; i--) {
                if (!flares[i].update(deltaTime)) {
                    scene.remove(flares[i].mesh);
                    flares.splice(i, 1);
                    
                }
            }

            if (global.missileSpecs.irccmMode === "outliner") {
                for (let i = 0; i < outlines.length; i++) {
                    if (outlines[i].userData.trackedFlare.heat > 50) {
                        outlines[i].position.copy(outlines[i].userData.trackedFlare.mesh.position);

                    }
                    if (!flares.includes(outlines[i].userData.trackedFlare)) {
                        scene.remove(outlines[i]);
                        outlines.splice(i, 1);
                    }   
                }

            }

            if (global.missileSpecs.rangefinderMode === "linear") {
                checkIntersections();
            } else if (global.missileSpecs.rangefinderMode === "omni") {
                const rangefinder = document.getElementById('rangefinder');
                // Find the nearest object
                let nearestObject = null;
                let nearestDistance = Infinity;
                const objects = scene.children;
                for (let i = 0; i < objects.length; i++) {
                    const object = objects[i];
                    const distance = camera.position.distanceTo(object.position);
                    if (distance < nearestDistance && objects[i] != sprite && objects[i] != radarBox && objects[i] != camera && distance <= 100) {
                        nearestObject = object;
                        nearestDistance = distance;
                    }
                }
                if (nearestObject) {
                    rangefinder.innerText = nearestDistance.toFixed(2) + 'm';
                } else {
                    rangefinder.innerText = '--';
                }
            }

            TWEEN.update();
            composer.render();

            global.stats.end();



    
    }

    animate();
}

window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});


initMainMenu();


