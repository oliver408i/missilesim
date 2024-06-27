import global from './variableHandler.js';
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

}
