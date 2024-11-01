import global from './variableHandler.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import * as THREE from 'three';
import Stats from 'stats';
import { Terrain, seed } from './lib/THREETerrainModule.js';

var xS = 400, yS = 400;
const size = 4092;

async function generateTerrain() {
    const xseed = Math.random();
    seed(xseed);
    global.seed = xseed;
    if (global.terrainScene) {
        global.scene.remove(global.terrainScene);
        global.terrainMesh.geometry.dispose();
        global.terrainMesh.material.dispose();
    }
    let heightmap = localStorage.getItem('terrainMode');
    if (!heightmap) {
        localStorage.setItem('terrainMode', 'Fault');
        heightmap = 'Fault';
    }
    global.hmap = heightmap;
    const terrain = new Terrain({
        easing: Terrain.Linear,
        frequency: 3,
        heightmap: Terrain[heightmap],
        material: new THREE.MeshLambertMaterial({color: "#9A9A9A"}),
        maxHeight: -10,
        minHeight: -200,
        steps: 1,
        xSegments: xS,
        xSize: size,
        ySegments: yS,
        ySize: size,
    });
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
        randomness: Math.random,
    });
    global.terrainScene.add(decoScene);
}

async function loadMissile() {
    let object = await (new OBJLoader()).loadAsync("assets/sidewinder.obj");
    const mesh = object.children[0];
    mesh.material = new THREE.MeshLambertMaterial({color: "#FFFFFF"});
    mesh.geometry.center();
    global.missileModel = mesh;
    global.scene.add(mesh);
    mesh.layers.set(1)
    global.missileModel.scale.set(0.01, 0.01, -0.01);
    global.missileModel.geometry.translate(0,0, -global.missileModel.geometry.boundingBox.max.z);
}

export function init() {
    global.scene = new THREE.Scene();
    global.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    global.renderer = new THREE.WebGLRenderer({canvas: document.getElementById('3dcanvas'),antialias: true});
    global.clock = new THREE.Clock();
    global.light = new THREE.HemisphereLight();
    global.scene.add(global.light);
    global.scene.fog = new THREE.Fog(0x000000, 0, 750);

    global.stats = new Stats();
    document.body.appendChild(global.stats.dom);
    
    const showFPS = localStorage.getItem('showFPS');
    if (showFPS != "None") {
        global.stats.showPanel(parseInt(showFPS));
    } else {
        global.stats.domElement.classList.add('fade-out');
    }

    let heightmap = localStorage.getItem('terrainMode');
    if (!heightmap) {
        localStorage.setItem('terrainMode', 'Fault');
        heightmap = 'Fault';
    }
    

    loadMissile()
    

    

    generateTerrain();


    addEventListener("message", (event) => {
        if (event.data == "changeTerrain") {
            generateTerrain();
            
        }
    })

    const elements = document.querySelectorAll('.hide');
    elements.forEach(element => {
        element.classList.remove('hide');
        element.classList.add('slide-in-fade-in');
    });

}

export function initText() {
    var infoText = "IR Seeker: Tracking";

    if (global.missileSpecs.irccmMode === 'outliner') {
        infoText += "\nIRCCM: Flare Outliner";
    }

    if (global.missileSpecs.rangefinderMode === 'linear') {
        infoText += "\nLaser: Front-Linear";
    } else if (global.missileSpecs.rangefinderMode === 'omni') {
        infoText += "\nLaser: Omnidirectional";
    }

    if (global.missileSpecs.proxyFuse === 'autoTargetting') {
        infoText += "\nProximity Fuse: Auto Target";
    } else if (global.missileSpecs.proxyFuse === 'laser') {
        infoText += "\nProximity Fuse: Laser";
    }

    document.getElementById('info').innerText = infoText;

}

export function hideMainMenu() {

    document.getElementById('settingsPageIframe').classList.add('fade-out');
    document.getElementById('title').classList.add('fade-out');
    document.getElementById('startGameButton').classList.add('fade-out');
    document.getElementById('mpButton').classList.add('fade-out');

    document.getElementById('help').classList.add('fade-out');
    document.getElementById('miscMainMenu').classList.add('fade-out');

    document.getElementById('startGameButton').onclick = () => {};
    document.getElementById('mpButton').onclick = () => {};

}
