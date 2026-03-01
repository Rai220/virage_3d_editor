import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class Viewport {
  constructor(canvas, editor) {
    this.canvas = canvas;
    this.editor = editor;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0xf0f0f0);
    this.renderer.shadowMap.enabled = true;

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10000);
    this.camera.position.set(50, 50, 50);
    this.camera.lookAt(0, 0, 0);

    this.orbitControls = new OrbitControls(this.camera, canvas);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.1;
    this.orbitControls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.orbitControls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    this.transformControls = new TransformControls(this.camera, canvas);
    this.transformControls.addEventListener('dragging-changed', (e) => {
      this.orbitControls.enabled = !e.value;
    });
    editor.scene.add(this.transformControls.getHelper());

    this._setupScene();
    this._setupLights();
    this._setupGrid();
    this._setupRaycaster();
    this._bindEvents();
    this._resize();
    this._animate();
  }

  _setupScene() {
    this.editor.scene.background = new THREE.Color(0xf0f0f0);
  }

  _setupLights() {
    const scene = this.editor.scene;
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dir1.position.set(50, 100, 50);
    dir1.castShadow = true;
    scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dir2.position.set(-50, 50, -50);
    scene.add(dir2);
  }

  _setupGrid() {
    this.gridHelper = new THREE.GridHelper(200, 200, 0xbbbbbb, 0xdddddd);
    this.gridHelper.material.opacity = 0.6;
    this.gridHelper.material.transparent = true;
    this.editor.scene.add(this.gridHelper);

    const axesHelper = new THREE.AxesHelper(30);
    this.editor.scene.add(axesHelper);

    this._setupBuildPlate();
  }

  _setupBuildPlate() {
    const geo = new THREE.PlaneGeometry(200, 200);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd0e8ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.0,
    });
    this.buildPlate = new THREE.Mesh(geo, mat);
    this.buildPlate.rotation.x = -Math.PI / 2;
    this.buildPlate.position.y = 0;
    this.buildPlate.receiveShadow = true;
    this.buildPlate.name = '__buildPlate__';
    this.editor.scene.add(this.buildPlate);

    const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(200, 0.1, 200));
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x6699cc, opacity: 0.5, transparent: true });
    this.buildPlateEdge = new THREE.LineSegments(edgeGeo, edgeMat);
    this.buildPlateEdge.position.y = 0;
    this.editor.scene.add(this.buildPlateEdge);

    this.buildPlateVisible = true;
  }

  toggleBuildPlate() {
    this.buildPlateVisible = !this.buildPlateVisible;
    this.buildPlate.visible = this.buildPlateVisible;
    this.buildPlateEdge.visible = this.buildPlateVisible;
    this.gridHelper.visible = this.buildPlateVisible;
    return this.buildPlateVisible;
  }

  _setupRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  _bindEvents() {
    window.addEventListener('resize', () => this._resize());

    this._pointerDownPos = null;
    this._isDraggingGizmo = false;

    this.transformControls.addEventListener('dragging-changed', (e) => {
      this._isDraggingGizmo = e.value;
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      this._pointerDownPos = { x: e.clientX, y: e.clientY };
      if (e.shiftKey) {
        this.orbitControls.enabled = false;
      }
    });

    this.canvas.addEventListener('pointerup', (e) => {
      this.orbitControls.enabled = true;

      if (!this._pointerDownPos) return;
      if (this._isDraggingGizmo) {
        this._pointerDownPos = null;
        return;
      }

      const dx = e.clientX - this._pointerDownPos.x;
      const dy = e.clientY - this._pointerDownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this._pointerDownPos = null;

      if (dist > 5) return;

      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.editor.getObjects());

      if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (e.shiftKey) {
          this.editor.selectToggle(obj);
        } else {
          this.editor.select(obj);
        }
        this.transformControls.attach(obj);
      } else if (!e.shiftKey) {
        this.editor.select(null);
        this.transformControls.detach();
      }
    });

    this.editor.addEventListener('objectAdded', (e) => {
      this.transformControls.attach(e.detail);
    });
  }

  _resize() {
    const container = this.canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setTransformMode(mode) {
    this.transformControls.setMode(mode);
  }

  dropToTable(mesh) {
    if (!mesh) return;
    const box = new THREE.Box3().setFromObject(mesh);
    mesh.position.y -= box.min.y;
  }

  dropSelectedToTable() {
    this.editor.selectedSet.forEach((m) => this.dropToTable(m));
    if (this.editor.selected) {
      this.editor.dispatchEvent(new CustomEvent('selectionChanged', { detail: this.editor.selected }));
    }
  }

  focusSelected() {
    const mesh = this.editor.selected;
    if (!mesh) return;
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const dist = size * 2;
    const dir = this.camera.position.clone().sub(this.orbitControls.target).normalize();
    this.camera.position.copy(center).add(dir.multiplyScalar(dist));
    this.orbitControls.target.copy(center);
    this.orbitControls.update();
  }

  setCameraView(viewName) {
    const dist = 80;
    const views = {
      front:  new THREE.Vector3(0, 0, dist),
      back:   new THREE.Vector3(0, 0, -dist),
      left:   new THREE.Vector3(-dist, 0, 0),
      right:  new THREE.Vector3(dist, 0, 0),
      top:    new THREE.Vector3(0, dist, 0.01),
      bottom: new THREE.Vector3(0, -dist, 0.01),
    };
    const pos = views[viewName];
    if (!pos) return;
    this.camera.position.copy(pos);
    this.orbitControls.target.set(0, 0, 0);
    this.camera.lookAt(0, 0, 0);
    this.orbitControls.update();
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    this.orbitControls.update();
    this.renderer.render(this.editor.scene, this.camera);
  }
}
