import global from './variableHandler.js';
import { createThermalShaderMaterial } from './thermalShader.js';
import * as THREE from 'three';

export function init() {
    global.scene = new THREE.Scene();
    global.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    global.renderer = new THREE.WebGLRenderer({canvas: document.getElementById('3dcanvas'),antialias: true});
    global.clock = new THREE.Clock();

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

    var xS = 63, yS = 63;
    const terrainScene = window.THREETerrain({
        easing: window.THREETerrain.Linear,
        frequency: 2.5,
        heightmap: window.THREETerrain.PerlinDiamond,
        material: createThermalShaderMaterial(20),
        maxHeight: -100,
        minHeight: -200,
        steps: 1,
        xSegments: xS,
        xSize: 1024,
        ySegments: yS,
        ySize: 1024,
    });
    // Assuming you already have your global scene, add the terrain to it
    global.scene.add(terrainScene);

    // Optional:
    // Get the geometry of the terrain across which you want to scatter meshes
    var geo = terrainScene.children[0].geometry;
    // Add randomly distributed foliage
    const decoScene = window.THREETerrain.ScatterMeshes(geo, {
        mesh: new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 12, 6), createThermalShaderMaterial(50)),
        w: xS,
        h: yS,
        spread: 0.02,
        randomness: Math.random,
    });
    terrainScene.add(decoScene);

}
