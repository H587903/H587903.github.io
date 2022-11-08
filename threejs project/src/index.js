"use strict";

import * as THREE from './three.module.js';
import TextureSplattingMaterial from "./TextureSplattingMaterial.js";
import TerrainGeometry from "./terrain/TerrainGeometry.js";
import { VRButton } from "./VRButton.js";
import {MeshBasicMaterial, MeshPhongMaterial, PlaneGeometry} from './three.module.js';
import Skybox from "./objects/Skybox.js";
import Tree from "./objects/Tree.js";
import * as Utils from "./utils.js";


let scene, renderer, camera, dolly;
let sun, hemisphereLight;
let skybox, tree;
let helper, geometryHelper;
let terrainGeometry, waterGeometry;
let terrainMesh, waterMesh;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

init();

function loop() {
  updateRendererSize();
  renderer.render(scene, camera);
}

async function init() {

  renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("canvas"),
    antialias: true,
  });

  const white = new THREE.Color(THREE.Color.NAMES.white);
  renderer.setClearColor(white, 1.0);

  //VRButton
  document.body.append(VRButton.createButton(renderer));
  renderer.xr.enabled = true;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  /*
  * add camera as child of dolly to move camera out of default camera position
  * and preventing it from returning to default position when entering VR
  */
  dolly = new THREE.PerspectiveCamera();
  dolly.position.set(-50, 50, -100)

  dolly.add(camera);
  scene.add(dolly);

  camera.lookAt(0, 0, 0);

  //const axesHelper = new THREE.AxesHelper(1);
  //scene.add(axesHelper);

  //hemisphere lighting
  hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xb1b1b1, 0.3);
  hemisphereLight.position.y = 20;
  scene.add(hemisphereLight);

  //sun
  sun = new THREE.DirectionalLight(white, 1.0);
  sun.position.x = 50;
  sun.position.y = 100;
  sun.position.z = 50;
  scene.add(sun);

  //skybox
  skybox = new Skybox();
  scene.add(skybox);

  //adding fog to the scene
  scene.fog = new THREE.FogExp2(0xf2f8f7, 0.01);

  //load image
  let terrainImage = await Utils.loadImage('images/terrain.png');

  //load textures
  let grass = new THREE.TextureLoader().load('images/grass.png');
  let rock = new THREE.TextureLoader().load('images/rock.png');
  let alphaMap = new THREE.TextureLoader().load('images/terrain.png');
  let water = new THREE.TextureLoader().load('images/water.jpg');

  grass.wrapS = THREE.RepeatWrapping;
  grass.wrapT = THREE.RepeatWrapping;
  grass.repeat.multiplyScalar(128 / 8);

  rock.wrapS = THREE.RepeatWrapping;
  rock.wrapT = THREE.RepeatWrapping;
  rock.repeat.multiplyScalar(128 / 8);

  //create materials
  let terrainMaterial = new TextureSplattingMaterial({
    color: THREE.Color.NAMES.white,
    colorMaps: [grass, rock],
    alphaMaps: [alphaMap]
  });

  let waterMaterial = new MeshBasicMaterial({
    map: water,
    side: THREE.DoubleSide
  });

  //create geometry
  terrainGeometry = new TerrainGeometry(256, 128, 32, terrainImage);
  waterGeometry = new PlaneGeometry(500, 500, 1, 1);

  //create mesh
  terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
  waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);

  //Rotate and move water plane
  waterMesh.rotation.x = Math.PI / 2;
  waterMesh.position.y = 0.2;

  //add to scene
  scene.add(terrainMesh);
  scene.add(waterMesh);

  //generate trees
  tree = new Tree(scene);
  tree.generate();

  //create and add geometryHelper to scene - cone that visualizes raycast hit
  geometryHelper = new THREE.ConeGeometry( 4, 10, 8 );
  geometryHelper.translate(0,0,0);
  geometryHelper.rotateX(Math.PI / 2);
  helper = new THREE.Mesh(geometryHelper, new THREE.MeshNormalMaterial());
  scene.add(helper);

  //geometryHelper position is updated in the onPointerMove function
  window.addEventListener( 'pointermove', onPointerMove );

  //calls loop every frame
  renderer.setAnimationLoop(loop);
}

/**
 * Raycast at mouse-pointer location, and update the position of geometryHelper accordingly
 * @param event
 */
function onPointerMove( event ) {

  pointer.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
  pointer.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
  raycaster.setFromCamera( pointer, camera );

  // See if the ray from the camera into the world hits one of our meshes
  const intersects = raycaster.intersectObject( terrainMesh );

  // Toggle rotation bool for meshes that we clicked
  if ( intersects.length > 0 ) {

    helper.position.set( 0, 0, 0 );
    helper.lookAt( intersects[ 0 ].face.normal );

    helper.position.copy( intersects[ 0 ].point );

  }
}

function updateRendererSize() {
  const { x: currentWidth, y: currentHeight } = renderer.getSize(
      new THREE.Vector2()
  );
  const width = renderer.domElement.clientWidth;
  const height = renderer.domElement.clientHeight;

  if (width !== currentWidth || height !== currentHeight) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}