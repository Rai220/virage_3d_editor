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
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
    editor.scene.add(this.transformControls.getHelper());

    this._keysPressed = {};

    this._setupScene();
    this._setupLights();
    this._setupGrid();
    this._setupRaycaster();
    this._setupAxisIndicator();
    this._bindEvents();
    this._bindArrowKeys();
    this._resize();
    this._animate();
  }

  _setupScene() {
    this.editor.scene.background = new THREE.Color(0xf0f0f0);

    // Invisible pivot used as TransformControls attachment point for multi-selection
    this._selectionPivot = new THREE.Object3D();
    this.editor.scene.add(this._selectionPivot);

    // BoxHelpers for visual selection feedback: Map<mesh, BoxHelper>
    this._selectionHelpers = new Map();
  }

  _setupLights() {
    const scene = this.editor.scene;
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dir1.position.set(50, 100, 50);
    dir1.castShadow = true;
    dir1.shadow.mapSize.width = 2048;
    dir1.shadow.mapSize.height = 2048;
    dir1.shadow.camera.left = -120;
    dir1.shadow.camera.right = 120;
    dir1.shadow.camera.top = 120;
    dir1.shadow.camera.bottom = -120;
    dir1.shadow.camera.near = 0.5;
    dir1.shadow.camera.far = 300;
    dir1.shadow.bias = -0.001;
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
    this._pointerDownShift = false;
    this._isDraggingGizmo = false;
    this._pivotData = null;

    this.transformControls.addEventListener('dragging-changed', (e) => {
      this._isDraggingGizmo = e.value;
      this.orbitControls.enabled = !e.value;
    });

    // When starting to drag with multi-selection: save each mesh's matrix relative to the pivot
    this.transformControls.addEventListener('mouseDown', () => {
      if (this.transformControls.object !== this._selectionPivot) {
        this._pivotData = null;
        return;
      }
      this._selectionPivot.updateMatrixWorld(true);
      const pivInv = new THREE.Matrix4().copy(this._selectionPivot.matrixWorld).invert();
      this._pivotData = [...this.editor.selectedSet].map((m) => {
        m.updateMatrixWorld(true);
        return {
          mesh: m,
          // localMatrix = pivotInverse * meshWorld => mesh in pivot's local space
          localMatrix: new THREE.Matrix4().multiplyMatrices(pivInv, m.matrixWorld),
        };
      });
    });

    // While dragging: apply pivot transform to all group members
    this.transformControls.addEventListener('change', () => {
      if (!this._pivotData) return;
      this._selectionPivot.updateMatrixWorld(true);
      const _p = new THREE.Vector3();
      const _q = new THREE.Quaternion();
      const _s = new THREE.Vector3();
      this._pivotData.forEach(({ mesh, localMatrix }) => {
        new THREE.Matrix4()
          .multiplyMatrices(this._selectionPivot.matrixWorld, localMatrix)
          .decompose(_p, _q, _s);
        mesh.position.copy(_p);
        mesh.quaternion.copy(_q);
        mesh.scale.copy(_s);
      });
    });

    this.transformControls.addEventListener('mouseUp', () => {
      this._pivotData = null;
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      this._pointerDownPos = { x: e.clientX, y: e.clientY };
      this._pointerDownShift = e.shiftKey;
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
      const wasShift = this._pointerDownShift;
      this._pointerDownPos = null;
      this._pointerDownShift = false;

      if (dist > 5) return;

      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.editor.getObjects());

      if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (wasShift) {
          this.editor.selectToggle(obj);
        } else {
          this.editor.select(obj);
        }
      } else if (!wasShift) {
        this.editor.select(null);
      }
      // TransformControls attachment is handled by selectionChanged → _updateSelection()
    });

    // Respond to all selection changes from editor
    this.editor.addEventListener('selectionChanged', () => {
      this._updateSelection();
    });
  }

  // Rebuild BoxHelpers and attach TransformControls for current selection
  _updateSelection() {
    this._selectionHelpers.forEach((h) => this.editor.scene.remove(h));
    this._selectionHelpers.clear();

    const selected = [...this.editor.selectedSet];

    if (selected.length === 0) {
      this.transformControls.detach();
      return;
    }

    // Cyan bounding box outline around each selected object
    selected.forEach((mesh) => {
      const helper = new THREE.BoxHelper(mesh, 0x00ccff);
      this.editor.scene.add(helper);
      this._selectionHelpers.set(mesh, helper);
    });

    if (selected.length === 1) {
      this.transformControls.attach(selected[0]);
    } else {
      // Place pivot at the geometric centroid of all selected positions
      const centroid = new THREE.Vector3();
      selected.forEach((m) => centroid.add(m.position));
      centroid.divideScalar(selected.length);

      this._selectionPivot.position.copy(centroid);
      this._selectionPivot.rotation.set(0, 0, 0);
      this._selectionPivot.scale.set(1, 1, 1);
      this._selectionPivot.updateMatrixWorld(true);

      this.transformControls.attach(this._selectionPivot);
    }
  }

  _setupAxisIndicator() {
    const axisCanvas = document.getElementById('axis-indicator');
    if (!axisCanvas) return;

    this._axisRenderer = new THREE.WebGLRenderer({ canvas: axisCanvas, alpha: true, antialias: true });
    this._axisRenderer.setPixelRatio(window.devicePixelRatio);
    this._axisRenderer.setSize(120, 120);

    this._axisScene = new THREE.Scene();

    this._axisCamera = new THREE.OrthographicCamera(-2.2, 2.2, 2.2, -2.2, 0.1, 100);
    this._axisCamera.position.set(0, 0, 5);
    this._axisCamera.lookAt(0, 0, 0);

    const axLen = 1.4;
    const axisGroup = new THREE.Group();

    const xMat = new THREE.LineBasicMaterial({ color: 0xe74c3c, linewidth: 2 });
    const yMat = new THREE.LineBasicMaterial({ color: 0x27ae60, linewidth: 2 });
    const zMat = new THREE.LineBasicMaterial({ color: 0x2980b9, linewidth: 2 });

    const xGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(axLen,0,0)]);
    const yGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,axLen,0)]);
    const zGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,axLen)]);

    axisGroup.add(new THREE.Line(xGeo, xMat));
    axisGroup.add(new THREE.Line(yGeo, yMat));
    axisGroup.add(new THREE.Line(zGeo, zMat));

    const coneH = 0.25;
    const coneR = 0.08;
    const coneGeo = new THREE.ConeGeometry(coneR, coneH, 8);

    const xCone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xe74c3c }));
    xCone.position.set(axLen + coneH / 2, 0, 0);
    xCone.rotation.z = -Math.PI / 2;
    axisGroup.add(xCone);

    const yCone = new THREE.Mesh(coneGeo.clone(), new THREE.MeshBasicMaterial({ color: 0x27ae60 }));
    yCone.position.set(0, axLen + coneH / 2, 0);
    axisGroup.add(yCone);

    const zCone = new THREE.Mesh(coneGeo.clone(), new THREE.MeshBasicMaterial({ color: 0x2980b9 }));
    zCone.position.set(0, 0, axLen + coneH / 2);
    zCone.rotation.x = Math.PI / 2;
    axisGroup.add(zCone);

    this._axisScene.add(axisGroup);

    this._axisLabels = this._createAxisLabels(axLen);
    this._axisScene.add(this._axisLabels);
  }

  _createAxisLabels(axLen) {
    const group = new THREE.Group();
    const labels = [
      { text: 'X', color: '#e74c3c', pos: new THREE.Vector3(axLen + 0.55, 0, 0) },
      { text: 'Y', color: '#27ae60', pos: new THREE.Vector3(0, axLen + 0.55, 0) },
      { text: 'Z', color: '#2980b9', pos: new THREE.Vector3(0, 0, axLen + 0.55) },
    ];

    labels.forEach(({ text, color, pos }) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(text, 32, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(pos);
      sprite.scale.set(0.5, 0.5, 0.5);
      group.add(sprite);
    });

    return group;
  }

  _bindArrowKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        this._keysPressed[e.key] = true;
      }
    });

    document.addEventListener('keyup', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        this._keysPressed[e.key] = false;
      }
    });
  }

  _updateArrowKeyMovement() {
    const speed = 1.0;
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();

    if (this._keysPressed['ArrowUp']) move.add(forward.clone().multiplyScalar(speed));
    if (this._keysPressed['ArrowDown']) move.add(forward.clone().multiplyScalar(-speed));
    if (this._keysPressed['ArrowLeft']) move.add(right.clone().multiplyScalar(-speed));
    if (this._keysPressed['ArrowRight']) move.add(right.clone().multiplyScalar(speed));

    if (move.lengthSq() > 0) {
      this.camera.position.add(move);
      this.orbitControls.target.add(move);
    }
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

    // Find the highest surface to land on: table (y=0) or top of any object with overlapping XZ footprint
    let targetY = 0;
    this.editor.objects.forEach((other) => {
      if (other === mesh) return;
      const otherBox = new THREE.Box3().setFromObject(other);
      const xOverlap = box.max.x > otherBox.min.x && box.min.x < otherBox.max.x;
      const zOverlap = box.max.z > otherBox.min.z && box.min.z < otherBox.max.z;
      if (xOverlap && zOverlap) {
        targetY = Math.max(targetY, otherBox.max.y);
      }
    });

    mesh.position.y += targetY - box.min.y;
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
    this._updateArrowKeyMovement();
    this.orbitControls.update();
    // Keep BoxHelpers in sync with their meshes every frame
    this._selectionHelpers.forEach((h) => h.update());
    this.renderer.render(this.editor.scene, this.camera);

    if (this._axisRenderer) {
      this._axisCamera.position.copy(this.camera.position).normalize().multiplyScalar(5);
      this._axisCamera.lookAt(0, 0, 0);
      this._axisCamera.up.copy(this.camera.up);
      this._axisRenderer.render(this._axisScene, this._axisCamera);
    }
  }
}
