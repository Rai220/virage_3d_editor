import * as THREE from 'three';

export class Editor extends EventTarget {
  constructor() {
    super();
    this.scene = new THREE.Scene();
    this.objects = [];
    this.selected = null;
  }

  addObject(mesh) {
    this.scene.add(mesh);
    this.objects.push(mesh);
    this.dispatchEvent(new CustomEvent('objectAdded', { detail: mesh }));
    this.select(mesh);
  }

  removeObject(mesh) {
    this.scene.remove(mesh);
    const idx = this.objects.indexOf(mesh);
    if (idx !== -1) this.objects.splice(idx, 1);
    if (this.selected === mesh) this.select(null);
    mesh.geometry.dispose();
    if (mesh.material.dispose) mesh.material.dispose();
    this.dispatchEvent(new CustomEvent('objectRemoved', { detail: mesh }));
  }

  select(mesh) {
    if (this.selected) {
      this.selected.material.emissive?.setHex(0x000000);
    }
    this.selected = mesh;
    if (mesh) {
      mesh.material.emissive?.setHex(0x222244);
    }
    this.dispatchEvent(new CustomEvent('selectionChanged', { detail: mesh }));
  }

  getObjects() {
    return this.objects;
  }
}
