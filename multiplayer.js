import global from './variableHandler.js';
import * as THREE from 'three';
import { Terrain, seed } from './lib/THREETerrainModule.js';

import { createThermalShaderMaterial } from './thermalShader.js';
import { update } from './lib/tween.esm.js';

let player;
var xS = 400, yS = 400;
const size = 4092;

function loadTerrain(type, xseed) {
    console.log("Using terrain from server "+type);
    if (global.terrainScene) {
        global.scene.remove(global.terrainScene);
        global.terrainMesh.geometry.dispose();
        global.terrainMesh.material.dispose();
    }
    seed(xseed);
    const terrain = new Terrain({
        easing: Terrain.Linear,
        frequency: 3,
        heightmap: Terrain[type],
        material: new THREE.MeshLambertMaterial({color: "#9A9A9A"}),
        maxHeight: -10,
        minHeight: -200,
        steps: 1,
        xSegments: xS,
        xSize: size,
        ySegments: yS,
        ySize: size,
    });

    function getSeed() {
        return xseed;
    }
    
    global.terrainMesh = terrain.getScene().children[0];
    global.terrainScene = terrain.getScene();
    global.scene.add(global.terrainScene);
    var geo = global.terrainScene.children[0].geometry;
    // Add randomly distributed foliage
    const decoScene = Terrain.ScatterMeshes(geo, {
        mesh: new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 12, 6), new THREE.MeshLambertMaterial({color: "#E8E8E8"})),
        w: xS,
        h: yS,
        spread: 0.005,
        randomness: getSeed,
    });
    global.terrainScene.add(decoScene);
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

export function startMp() {

    function displayGameOver() {
        healthText.textContent = "You died!";
        socket.close();
        const deadText = document.createElement('div');
        deadText.style.position = 'absolute';
        deadText.style.top = '50%';
        deadText.style.left = '50%';
        deadText.style.transform = 'translate(-50%, -50%)';
        deadText.style.fontSize = '64px';
        deadText.style.fontWeight = 'bold';
        deadText.style.color = 'red';
        deadText.style.zIndex = '1';
        deadText.style.fontFamily = 'SHP';
        deadText.textContent = 'You died!';
        document.body.appendChild(deadText);
    
        cancelAnimationFrame(id);
    
        socket.close();
    }


    global.miscSettings = JSON.parse(localStorage.getItem('miscSettings'));
    global.missileSpecs = JSON.parse(localStorage.getItem('missileSpecs'));
    let name = prompt("Enter your name: ");

    const hudDiv = document.createElement('div');
    hudDiv.id = 'hudDiv';
    hudDiv.style.position = 'absolute';
    hudDiv.style.width = '90%'; // Set size based on the desired sprite size
    hudDiv.style.height = '90%';
    hudDiv.style.backgroundImage = `url('assets/${global.missileSpecs.sightImage}.png')`; // Load your sprite image
    hudDiv.style.backgroundSize = 'contain';
    hudDiv.style.backgroundPosition = 'center';
    hudDiv.style.backgroundRepeat = 'no-repeat';
    hudDiv.style.pointerEvents = 'none'; // Prevents interaction with the HUD
    hudDiv.style.opacity = '0.8'; // Optional: make it slightly transparent
    document.body.appendChild(hudDiv);

    function centerDiv(someDiv, centerX = window.innerWidth / 2, centerY = window.innerHeight / 2) {
    
        // Adjust the HUD div to center its middle point at the center of the screen
        someDiv.style.left = `${centerX - someDiv.offsetWidth / 2}px`;
        someDiv.style.top = `${centerY - someDiv.offsetHeight / 2}px`;
    }

    centerDiv(hudDiv);

    const socket = new WebSocket('ws://localhost:3412/ws');

    const raycaster = new THREE.Raycaster();
    const proximityThreshold = 5;
    var cameraDirection = new THREE.Vector3();
    let closeObjects = [];
    let seekerTarget = null;

    var uuid;

    let id;

    socket.onopen = () => {
        socket.send(JSON.stringify({
            '_type': 'join',
            'name': name,
            'terrainType': global.hmap,
            'terrainSeed': global.seed
        }));
        global.camera.position.set(0, 0, 1.5);
        global.camera.rotation.set(0, 0, 0);
        global.flame.layers.set(1);
    }

    let players = {};
    let projectiles = {};
    let playerModels = {};
    let projectileModels = {};

    const healthText = document.createElement('div');
    healthText.style.position = 'absolute';
    healthText.style.top = '10px';
    healthText.style.right = '10px';
    healthText.style.color = 'white';
    healthText.style.fontSize = '24px';
    healthText.style.fontFamily = 'SHP';
    healthText.style.zIndex = '1';
    healthText.innerText = 'Health: 100%';
    document.body.appendChild(healthText);

    const messageText = document.createElement('div');
    messageText.style.position = 'absolute';
    messageText.style.top = '40px';
    messageText.style.right = '10px';
    messageText.style.color = 'white';
    messageText.style.fontSize = '24px';
    messageText.style.fontFamily = 'SHP';
    messageText.style.zIndex = '1';
    messageText.className = 'messages-fade-out';
    messageText.innerText = 'Joined server';
    document.body.appendChild(messageText);

    let seekerOn = false;

    const seekerRingOuter = document.getElementById('seeker-outer');
    const seekerRingInner = document.getElementById('seeker-inner');
    centerDiv(seekerRingOuter);
    centerDiv(seekerRingInner);

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data['_type'] == 'id') {
            uuid = data['id'];
            if (data['terrainType']) {
                loadTerrain(data['terrainType'], data['terrainSeed']);
            }
            socket.send(JSON.stringify({
                '_type': 'update',
            }))
        }
        else if (data['_type'] == 'update') {
            if (data['players']) {
                players = data['players'];
                projectiles = data['projectiles'];
                if (id == null && uuid != null) {
                    console.log("Starting game loop. User "+uuid)
                    id = requestAnimationFrame(animate);
                }
            }
            
        }
        else if (data['_type'] == 'message') {
            if (messageText.innerText != data['message']['message']) {
                messageText.innerText = data['message']['message'];
                messageText.classList.remove('messages-fade-out');
                messageText.classList.add('messages-fade-out');
            }
            
        }
    }

    global.missileModel.layers.set(1);
    cancelAnimationFrame(global.mainMenuAnimation);

    global.socket = socket;
    window.socket = socket;

    const cubeGeometry = new THREE.BoxGeometry();
    const cubeMaterial = createThermalShaderMaterial(100); // Initial heat value
    player = new THREE.Mesh(cubeGeometry, cubeMaterial);

    const bulletGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const bulletMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });

    global.scene.add(player);

    const keyState = {};

    document.addEventListener('keydown', (event) => {
        keyState[event.key] = true;
    }, false);

    document.addEventListener('keyup', (event) => {
        keyState[event.key] = false;
    }, false);

    global.camera.position.set(player.position.clone());

    let targetRotationX = 0;
    let targetRotationY = 0;
    let targetRotationZ = 0;
    const rotationSpeed = 0.05; // Adjust this value for smoother/slower or quicker turning
    const turnSpeed = 0.02;

    function animate() {
        global.stats.begin();
        global.socket.send(JSON.stringify({
            '_type': 'update',
        }));

        global.socket.send(JSON.stringify({
            "_type": "messages"
        }))

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

        for (let otherPlayer in players) {
            otherPlayer = players[otherPlayer];
            if (player["id"] != uuid && !playerModels[otherPlayer["id"]]) {
                playerModels[otherPlayer["id"]] = new THREE.Mesh(cubeGeometry, cubeMaterial);
                playerModels[otherPlayer["id"]].position.set(otherPlayer["location"][0], otherPlayer["location"][1], otherPlayer["location"][2]);
                playerModels[otherPlayer["id"]].rotation.set(otherPlayer["rotation"][0], otherPlayer["rotation"][1], otherPlayer["rotation"][2]);
                global.scene.add(playerModels[otherPlayer["id"]]);
            } else if (player["id"] != uuid) {
                playerModels[otherPlayer["id"]].position.set(otherPlayer["location"][0], otherPlayer["location"][1], otherPlayer["location"][2]);
                playerModels[otherPlayer["id"]].rotation.set(otherPlayer["rotation"][0], otherPlayer["rotation"][1], otherPlayer["rotation"][2]);
            }
        }

        for (let otherPlayers in playerModels) {
            if (!players[otherPlayers]) {
                global.scene.remove(playerModels[otherPlayers]);
                playerModels[otherPlayers].geometry.dispose();
                playerModels[otherPlayers].material.dispose();
                delete playerModels[otherPlayers];
            }
        }

        for (let projectile in projectiles) {
            projectile = projectiles[projectile];
            if (!projectileModels[projectile["id"]]) {
                projectileModels[projectile["id"]] = new THREE.Mesh(bulletGeometry, bulletMaterial);
                projectileModels[projectile["id"]].position.set(projectile["location"][0], projectile["location"][1], projectile["location"][2]);
                projectileModels[projectile["id"]].rotation.set(projectile["rotation"][0], projectile["rotation"][1], projectile["rotation"][2]);
                global.scene.add(projectileModels[projectile["id"]]);
            } else {
                projectileModels[projectile["id"]].position.set(projectile["location"][0], projectile["location"][1], projectile["location"][2]);
                projectileModels[projectile["id"]].rotation.set(projectile["rotation"][0], projectile["rotation"][1], projectile["rotation"][2]);
            }
        }

        for (let projectile in projectileModels) {
            if (!projectiles[projectile]) {
                global.scene.remove(projectileModels[projectile]);
                projectileModels[projectile].geometry.dispose();
                projectileModels[projectile].material.dispose();
                delete projectileModels[projectile];
            }
        }

        if (players[uuid]) {
            healthText.textContent = "Health: " + players[uuid]["health"]+ "%";
            if (players[uuid]["health"] <= 0) {
                displayGameOver();
                return;

            }
            player.position.set(players[uuid]['location'][0], players[uuid]['location'][1], players[uuid]['location'][2]);
            player.rotation.set(players[uuid]['rotation'][0], players[uuid]['rotation'][1], players[uuid]['rotation'][2]);
            global.camera.rotation.copy(player.rotation);
            const currentQuat = global.camera.quaternion.clone();
            const targetQuatX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), targetRotationX);
            const targetQuatY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetRotationY);
            const targetQuat = new THREE.Quaternion().multiplyQuaternions(targetQuatY, targetQuatX);

            currentQuat.slerp(targetQuat, rotationSpeed);
            global.camera.quaternion.copy(currentQuat);
            if (parseInt(global.miscSettings.controlMode) > 0) global.camera.rotation.z += (targetRotationZ - global.camera.rotation.z) * rotationSpeed;

            // Move the camera forward
            let direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(global.camera.quaternion);
            global.camera.position.addScaledVector(direction, players[uuid]['moveSpeed']);

            player.position.copy(global.camera.position);
            player.rotation.copy(global.camera.rotation);

            global.socket.send(JSON.stringify({
                '_type': 'updatePosition',
                'location': [global.camera.position.x, global.camera.position.y, global.camera.position.z],
                'rotation': [global.camera.rotation.x, global.camera.rotation.y, global.camera.rotation.z]
            }));

            if (keyState[' ']) {
                global.socket.send(JSON.stringify({
                    '_type': 'fire',
                    'location': [global.camera.position.x, global.camera.position.y, global.camera.position.z],
                    'quaternion': [global.camera.quaternion.x, global.camera.quaternion.y, global.camera.quaternion.z, global.camera.quaternion.w],
                    'rotation': [global.camera.rotation.x, global.camera.rotation.y, global.camera.rotation.z],
                }));
            }

            if (keyState['x']) {
                if (!seekerOn) {
                    seekerRingOuter.style.display = 'block';
                    seekerRingOuter.classList.add('flash');

                    seekerRingInner.style.display = 'block';
                    seekerRingInner.classList.add('flash');

                    seekerOn = true;
                } else {
                    seekerRingOuter.style.display = 'none';
                    seekerRingOuter.classList.remove('flash');

                    seekerRingInner.style.display = 'none';
                    seekerRingInner.classList.remove('flash');

                    seekerTarget = null;

                    seekerOn = false;
                }
            }

            if (keyState['v'] && seekerTarget != null) {
                let targetId = null;
                for (let [key, value] of Object.entries(playerModels)) {
                    if (value === seekerTarget) {
                        targetId = key;
                        break;
                    }
                }
                if (targetId == null) {
                    return;
                }
                const rotData = [global.camera.quaternion.x, global.camera.quaternion.y, global.camera.quaternion.z, global.camera.quaternion.w];
                socket.send(JSON.stringify({
                    '_type': 'missileLaunch',
                    'target': targetId,
                    'location': [global.camera.position.x, global.camera.position.y, global.camera.position.z],
                    'rotation': rotData
                }))
                seekerTarget = null;
                seekerOn = false;

                seekerRingInner.style.display = 'none';
                seekerRingOuter.style.display = 'none';


                seekerRingInner.classList.remove("green-outline");
                seekerRingOuter.classList.remove("green-outline");
            }

            if (seekerOn) {
                global.camera.getWorldDirection(cameraDirection);
                raycaster.set(global.camera.position, cameraDirection);
                if (seekerTarget == null) {
                    closeObjects = [];
                    for (const i in playerModels) {
                        if (i != uuid) {
                            const mesh = playerModels[i];
                            const closestPointOnRay = new THREE.Vector3();
                            raycaster.ray.closestPointToPoint(mesh.position, closestPointOnRay);
                            const distanceToRay = closestPointOnRay.distanceTo(mesh.position);
                            if (distanceToRay <= proximityThreshold && isMeshVisible(global.camera, mesh)) {
                                // Calculate the distance from the camera to this object for comparison later
                                const distanceToCamera = global.camera.position.distanceTo(mesh.position);
                            
                                closeObjects.push({
                                    object: mesh,
                                    distanceToRay: distanceToRay,
                                    distanceToCamera: distanceToCamera
                                });
                            }
                        }
                    }
                    if (closeObjects.length > 0) {
                        // Sort the close objects by distance to the camera
                        closeObjects.sort((a, b) => a.distanceToCamera - b.distanceToCamera);
                    
                        // The closest object will be the first in the sorted array
                        seekerTarget = closeObjects[0].object;

                        seekerRingInner.classList.remove('flash');
                        seekerRingInner.classList.add("green-outline");
                        seekerRingOuter.classList.remove('flash');
                        seekerRingOuter.classList.add("green-outline");
                    } else {
                        seekerTarget = null;
                        seekerRingInner.classList.add('flash');
                        seekerRingInner.classList.remove("green-outline");
                        seekerRingOuter.classList.add('flash');
                        seekerRingOuter.classList.remove("green-outline");
                    }
                } else {
                    const dx = seekerRingInner.offsetLeft - seekerRingOuter.offsetLeft;
                    const dy = seekerRingInner.offsetTop - seekerRingOuter.offsetTop;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const radiusInner = seekerRingInner.offsetWidth / 2;
                    const radiusOuter = seekerRingOuter.offsetWidth / 2;
                    if (distance > radiusOuter - radiusInner) {
                        seekerTarget = null;
                        seekerRingInner.classList.add('flash');
                        seekerRingInner.classList.remove("green-outline");
                        seekerRingOuter.classList.add('flash');
                        seekerRingOuter.classList.remove("green-outline");
                    }
                }
            }
            if (seekerOn && seekerTarget != null) {
                const vector = new THREE.Vector3();
                seekerTarget.getWorldPosition(vector);
                vector.project(global.camera);
                const x = (vector.x * 0.5 + 0.5) * global.renderer.domElement.clientWidth;
                const y = (1 - (vector.y * 0.5 + 0.5)) * global.renderer.domElement.clientHeight;
                seekerRingInner.style.left = `${x}px`;
                seekerRingInner.style.top = `${y}px`;
                

            } else if (seekerTarget == null) {
                seekerRingInner.style.left = window.innerWidth / 2 + 'px';
                seekerRingInner.style.top = window.innerHeight / 2 + 'px';
            }

              



        } else {
            console.log(uuid,players[uuid])
            displayGameOver();
            return;
        }

        global.composer.render();

        global.renderer.render(global.scene, global.camera);

        global.stats.end();

        id = requestAnimationFrame(animate);
    }
    
    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        global.renderer.setSize(width, height);
        global.composer.setSize(width, height);
        global.camera.aspect = width / height;
        global.camera.updateProjectionMatrix();
        centerDiv(hudDiv);
        centerDiv(seekerRingInner);
        centerDiv(seekerRingOuter);
    });
}

