let scene, camera, renderer, ground, raycaster, mouse, currentPolygon;

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 10, 20);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const groundGeometry = new THREE.PlaneGeometry(50, 50);
  const groundMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(50, 50, 0x000000, 0x000000);
  gridHelper.rotation.x = Math.PI / 2;
  scene.add(gridHelper);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('click', onMouseClick, false);
  document.getElementById('complete').addEventListener('click', completePolygon);
  document.getElementById('copy').addEventListener('click', copyPolygon);
  document.getElementById('reset').addEventListener('click', resetScene);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseClick(event) {
  if (event.target.tagName === 'BUTTON') return;
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(ground);

  if (intersects.length > 0) {
    const point = intersects[0].point;
    if (currentPolygon && currentPolygon.isMoving) {
      currentPolygon.place(point);
    } else if (currentPolygon) {
      currentPolygon.addVertex(point);
    }
  }
}

function completePolygon() {
  if (currentPolygon) {
    currentPolygon.complete();
  }
}

function copyPolygon() {
  if (currentPolygon && currentPolygon.isComplete) {
    const newPolygon = currentPolygon.clone();
    currentPolygon = newPolygon;
    scene.add(currentPolygon.mesh);
    scene.add(currentPolygon.edgeLines);
    window.addEventListener('mousemove', movePolygonWithCursor, false);
  }
}

function movePolygonWithCursor(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(ground);
  if (intersects.length > 0) {
    const point = intersects[0].point;
    currentPolygon.move(point);
  }
}

function resetScene() {
  while (scene.children.length > 0) {
    const child = scene.children[0];
    scene.remove(child);
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      child.material.dispose();
    }
  }

  scene.add(ground);
  scene.add(gridHelper);

  currentPolygon = null;
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

class Polygon {
  constructor() {
    this.vertices = [];
    this.mesh = null;
    this.edgeLines = null;
    this.isComplete = false;
    this.isMoving = false;
  }

  addVertex(point) {
    const vertex = new THREE.Vector3(point.x, 0, point.z);
    this.vertices.push(vertex);

    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(vertex);
    scene.add(sphere);
  }

  complete() {
    if (this.vertices.length > 2) {
      const shape = new THREE.Shape(this.vertices.map(v => new THREE.Vector2(v.x, v.z)));
      const extrudeSettings = { depth: 0.1, bevelEnabled: false };
      const polygonGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

      const polygonMaterial = new THREE.MeshBasicMaterial({ color: 0xffa500, side: THREE.DoubleSide });
      this.mesh = new THREE.Mesh(polygonGeometry, polygonMaterial);
      scene.add(this.mesh);

      const edges = new THREE.EdgesGeometry(polygonGeometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
      this.edgeLines = new THREE.LineSegments(edges, lineMaterial);
      scene.add(this.edgeLines);

      this.isComplete = true;
    }
  }

  clone() {
    const newPolygon = new Polygon();
    newPolygon.vertices = this.vertices.slice();
    newPolygon.isComplete = true;
    newPolygon.isMoving = true;

    const shape = new THREE.Shape(newPolygon.vertices.map(v => new THREE.Vector2(v.x, v.z)));
    const extrudeSettings = { depth: 0.1, bevelEnabled: false };
    const polygonGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    const polygonMaterial = new THREE.MeshBasicMaterial({ color: 0xffa500, side: THREE.DoubleSide });
    newPolygon.mesh = new THREE.Mesh(polygonGeometry, polygonMaterial);

    const edges = new THREE.EdgesGeometry(polygonGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
    newPolygon.edgeLines = new THREE.LineSegments(edges, lineMaterial);

    return newPolygon;
  }

  move(point) {
    if (this.isMoving) {
      this.mesh.position.set(point.x, 0, point.z);
      this.edgeLines.position.set(point.x, 0, point.z);
    }
  }

  place(point) {
    this.mesh.position.set(point.x, 0, point.z);
    this.edgeLines.position.set(point.x, 0, point.z);
    this.isMoving = false;
    window.removeEventListener('mousemove', movePolygonWithCursor, false);
  }
}

currentPolygon = new Polygon();
