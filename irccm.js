import * as THREE from 'three';
import global from './variableHandler.js';

export function addMarkerToSphere(scene, markerList, sphere) {
    // Compute the bounding box of the sphere
    const boundingBox = new THREE.Box3().setFromObject(sphere.mesh);
    const boundingBoxSize = new THREE.Vector3();
    boundingBox.getSize(boundingBoxSize);

    // Create cube outline marker based on bounding box size
    const outlineGeometry = new THREE.BoxGeometry(boundingBoxSize.x * 2, boundingBoxSize.y * 2, boundingBoxSize.z * 2); // Slightly larger than the sphere
    const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const outlineCube = new THREE.Mesh(outlineGeometry, outlineMaterial);

    // Set the position of the outline cube to match the sphere's position
    outlineCube.position.copy(sphere.mesh.position);

    outlineCube.userData.trackedFlare = sphere;

    // Add the outline cube to the scene
    scene.add(outlineCube);

    // Add the outline cube to the marker list
    markerList.push(outlineCube);
}