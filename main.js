import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createThermalShaderMaterial } from './thermalShader.js';
import { Flare } from './flare.js';
import global from './variableHandler.js';
import { addMarkerToSphere } from './irccm.js';


import { init } from './init.js';

/*
global.missileSpecs = {
    irccmMode: 'outliner',
    rangefinderMode: 'linear',
    proxyFuse: 'laser', // 'laser' or 'autoTargetting'
    proxyFuseDistance: 5,
}*/

global.missileSpecs = JSON.parse(localStorage.getItem('missileSpecs'));

init();

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

const cubeGeometry = new THREE.BoxGeometry();
const cubeMaterial = createThermalShaderMaterial(100); // Initial heat value
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.x = 0;
scene.add(cube);

const distanceThreshold = 10; // Adjust this value as needed
const target = cube
const targetDistance = 500; // Distance in front of the camera
const targetRange = 200; // Range within which the target can be placed around the center



// Calculate a random position in front of the camera
const randomX = (Math.random() - 0.5) * targetRange;
const randomY = (Math.random() - 0.5) * targetRange;
const randomZ = -targetDistance; // In front of the camera

// Apply the random position relative to the camera's current position and orientation
const targetPosition = new THREE.Vector3(randomX, randomY, randomZ).applyQuaternion(camera.quaternion);
target.position.copy(camera.position.clone().add(targetPosition));

function checkDistanceToTarget() {
    if (!isMeshVisible(camera, target) && camera.position.distanceTo(target.position) > distanceThreshold) {
        document.getElementById('gameOver').innerText = 'Game Over: Missed Target';
        document.getElementById('gameOver').style.display = 'block';
        cancelAnimationFrame(id); // Stop the animation
    }
    if (global.missileSpecs.proxyFuse === 'autoTargetting') {
        if (camera.position.distanceTo(target.position) < global.missileSpecs.proxyFuseDistance) {
            explode();
        }
    }
}

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

            // Draw the edges of the cube
            const edges = new THREE.EdgesGeometry(target.geometry);
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
            const lines = new THREE.LineSegments(edges, lineMaterial);
            lines.position.copy(target.position);
            lines.rotation.copy(target.rotation);
            scene.add(lines);

            // Draw a line from the position marker to the target cube
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([camera.position, target.position]), new THREE.LineBasicMaterial({ color: 0xFFA500}));
            scene.add(line);

            sprite.layers.set(1); // Hide it

            for (let i = 0; i < flares.length; i++) {
                flares[i].mesh.layers.set(1);
            }

            for (let i = 0; i < outlines.length; i++) {
                outlines[i].layers.set(1);
            }

            

            let controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true; // Enable damping (inertia)
            controls.dampingFactor = 0.25; // Damping factor
            controls.screenSpacePanning = false; // Disable panning
            controls.maxPolarAngle = Math.PI / 2; // Limit the vertical rotation angle

            controls.target.set(target.position.x, target.position.y, target.position.z);

            controls.minDistance = distanceThreshold + 2;
            
            function endGameAnimation() {
                requestAnimationFrame(endGameAnimation);
                controls.update();
                renderer.render(scene, camera);
            }

            endGameAnimation();
        },200);
        
        
    } else {
        document.getElementById('gameOver').innerText = 'Game Over: Too Far! ' + distance.toFixed(2) + 'm';
        document.getElementById('gameOver').style.display = 'block';
        cancelAnimationFrame(id); // Stop the animation
    }
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

camera.position.z = 5;

// For updating heat value
let heatDirection = 0.5;
let heatValue = 100;
let timer = 0;

const targetVelocity = new THREE.Vector3(0,0,-0.5);
const moveSpeed = 1.5;
const targetRotation = new THREE.Vector3();

function updateTargetRotation() {
    targetRotation.set(
      Math.random() * 2 * Math.PI, // Randomize X-axis rotation
      cube.rotation.y,              // Keep Y-axis rotation constant
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
  

let targetRotationX = 0;
let targetRotationY = 0;
const rotationSpeed = 0.05; // Adjust this value for smoother/slower or quicker turning

const keyState = {};

document.addEventListener('keydown', (event) => {
    keyState[event.key] = true;
}, false);

document.addEventListener('keyup', (event) => {
    keyState[event.key] = false;
}, false);

const spriteMaterial = new THREE.SpriteMaterial({ map:  new THREE.TextureLoader().load('assets/'+global.missileSpecs.sightImage+'.png')});
const sprite = new THREE.Sprite(spriteMaterial);
// Position the sprite in front of the camera
sprite.position.set(0, 0, -1);
sprite.scale.set(1.5,1.5, 1);
sprite.layers.set(0);
camera.add(sprite); // Add sprite to the camera
scene.add(camera);

let currentV = targetVelocity;
let id;

function animate() {
  id = requestAnimationFrame(animate);

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
        targetRotationX += turnSpeed;
    }
    if (keyState['s']) {
        targetRotationX -= turnSpeed;
    }
    if (keyState['a']) {
        targetRotationY += turnSpeed;
    }
    if (keyState['d']) {
        targetRotationY -= turnSpeed;
    }
    if (keyState[' ']) {
        explode();
    }

    // Smoothly interpolate the camera's rotation towards the target rotation
    camera.rotation.x += (targetRotationX - camera.rotation.x) * rotationSpeed;
    camera.rotation.y += (targetRotationY - camera.rotation.y) * rotationSpeed;

    // Move the camera forward
    let direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(direction, moveSpeed);

    // Check the distance to the target
    checkDistanceToTarget();

    
    // Randomly create flares from the target's position in clusters of 3-5
    if (Math.random() < 0.02) {
        const numFlares = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numFlares; i++) {
            createFlare(target.position);
        }
    }
    

    const deltaTime = clock.getDelta();

    timer += deltaTime;

    if (timer >= 2) {
        updateTargetRotation();
        timer = 0;
    }

    currentV.lerp(targetVelocity, 0.4);

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
            if (distance < nearestDistance && objects[i] != sprite && objects[i] != camera && distance <= 100) {
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
    composer.render();



  
}

animate();

window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
