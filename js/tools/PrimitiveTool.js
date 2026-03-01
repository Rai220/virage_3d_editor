import * as THREE from 'three';

const PRIMITIVE_COLOR = 0x4a90d9;

export class PrimitiveTool {
  constructor(editor) {
    this.editor = editor;
    this.gridSnap = 5;
  }

  setGridSnap(value) {
    this.gridSnap = value;
  }

  _snap(v) {
    return Math.round(v / this.gridSnap) * this.gridSnap;
  }

  create(type) {
    let geometry;
    const name = type;

    switch (type) {
      case 'box':
        geometry = new THREE.BoxGeometry(10, 10, 10);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(5, 32, 32);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(5, 5, 10, 32);
        break;
      case 'cone':
        geometry = new THREE.ConeGeometry(5, 10, 32);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(5, 2, 16, 48);
        break;
      default:
        geometry = new THREE.BoxGeometry(10, 10, 10);
    }

    const material = new THREE.MeshStandardMaterial({
      color: PRIMITIVE_COLOR,
      roughness: 0.5,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.y = this._getYOffset(type);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.editor.addObject(mesh);
    return mesh;
  }

  _getYOffset(type) {
    switch (type) {
      case 'box': return 5;
      case 'sphere': return 5;
      case 'cylinder': return 5;
      case 'cone': return 5;
      case 'torus': return 5;
      default: return 5;
    }
  }
}
