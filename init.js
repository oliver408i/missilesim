import global from './variableHandler.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import * as THREE from 'three';
import Stats from 'stats';

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
        global.stats.domElement.style.display = 'none';
    }
    

    loadMissile()
    

    var xS = 200, yS = 200;
    const size = 4092;
    const terrainScene = window.THREETerrain({
        easing: window.THREETerrain.Linear,
        frequency: 2.5,
        heightmap: window.THREETerrain.Fault,
        material: new THREE.MeshLambertMaterial({color: "#9A9A9A"}),
        maxHeight: -100,
        minHeight: -200,
        steps: 1,
        xSegments: xS,
        xSize: size,
        ySegments: yS,
        ySize: size,
    });

    global.terrainMesh = terrainScene.children[0];
    console.log(global.terrainMesh);

    // Assuming you already have your global scene, add the terrain to it
    global.scene.add(terrainScene);

    // Optional:
    // Get the geometry of the terrain across which you want to scatter meshes
    var geo = terrainScene.children[0].geometry;
    // Add randomly distributed foliage
    const decoScene = window.THREETerrain.ScatterMeshes(geo, {
        mesh: new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 12, 6), new THREE.MeshLambertMaterial({color: "#E8E8E8"})),
        w: xS,
        h: yS,
        spread: 0.02,
        randomness: Math.random,
    });
    terrainScene.add(decoScene);

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
    global.flame.layers.set(1);
    global.missileModel.layers.set(1);

    document.getElementById('settingsPageIframe').style.display = 'none';
    document.getElementById('title').style.display = 'none';
    document.getElementById('startGameButton').style.display = 'none';
    document.getElementById('help').style.display = 'none';
}
