import global from './variableHandler.js';
import * as THREE from 'three';
import { Terrain, seed } from './lib/THREETerrainModule.js';

import { createThermalShaderMaterial } from './thermalShader.js';

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

export function startMp() {
    global.miscSettings = JSON.parse(localStorage.getItem('miscSettings'));
    let name = prompt("Enter your name: ");

    const socket = new WebSocket('ws://localhost:3412/ws');

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
        animate();
    }

    let players = {};
    let projectiles = {};
    let playerModels = {};
    let projectileModels = {};

    let healthText = document.createElement('div');
    healthText.style.position = 'absolute';
    healthText.style.top = '10px';
    healthText.style.right = '10px';
    healthText.style.color = 'white';
    healthText.style.fontSize = '24px';
    healthText.style.fontFamily = 'SHP';
    healthText.style.zIndex = '1';
    healthText.innerText = 'Health: 100%';
    document.body.appendChild(healthText);

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data['_type'] == 'id') {
            uuid = data['id'];
            if (data['terrainType']) {
                loadTerrain(data['terrainType'], data['terrainSeed']);
            }
            id = requestAnimationFrame(animate);
        }
        else if (data['_type'] == 'update') {
            if (data['players']) {
                players = data['players'];
                projectiles = data['projectiles'];
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
                let velocity = new THREE.Vector3(0, 0, 0);
                let direction = new THREE.Vector3(0, 0, -0.2);
                direction.applyQuaternion(global.camera.quaternion);
                velocity.addScaledVector(direction, 10);
                global.socket.send(JSON.stringify({
                    '_type': 'fire',
                    'velocity': [velocity.x, velocity.y, velocity.z],
                    'rotation': [global.camera.rotation.x, global.camera.rotation.y, global.camera.rotation.z],
                    'location': [global.camera.position.x, global.camera.position.y, global.camera.position.z]
                }));
            }

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
    });
}

