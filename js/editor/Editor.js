import * as THREE from 'three';
import { CommandHistory } from '../commands/CommandHistory.js';
import { AddObjectCmd } from '../commands/AddObjectCmd.js';
import { RemoveObjectCmd } from '../commands/RemoveObjectCmd.js';

export class Editor extends EventTarget {
  constructor() {
    super();
    this.scene = new THREE.Scene();
    this.objects = [];
    this.selected = null;
    this.history = new CommandHistory();
  }

  addObject(mesh) {
    const cmd = new AddObjectCmd(this, mesh);
    this.history.execute(cmd);
  }

  addObjectDirect(mesh) {
    this.scene.add(mesh);
    this.objects.push(mesh);
    this.dispatchEvent(new CustomEvent('objectAdded', { detail: mesh }));
    this.select(mesh);
  }

  removeObject(mesh) {
    const cmd = new RemoveObjectCmd(this, mesh);
    this.history.execute(cmd);
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

  duplicateSelected() {
    if (!this.selected) return null;
    const src = this.selected;
    const geometry = src.geometry.clone();
    const material = src.material.clone();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = src.name;
    mesh.position.copy(src.position);
    mesh.position.x += 10;
    mesh.rotation.copy(src.rotation);
    mesh.scale.copy(src.scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.addObject(mesh);
    return mesh;
  }

  undo() {
    const ok = this.history.undo();
    this.dispatchEvent(new CustomEvent('historyChanged'));
    return ok;
  }

  redo() {
    const ok = this.history.redo();
    this.dispatchEvent(new CustomEvent('historyChanged'));
    return ok;
  }

  clearScene() {
    const toRemove = [...this.objects];
    toRemove.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material.dispose) mesh.material.dispose();
    });
    this.objects = [];
    this.selected = null;
    this.history.clear();
    this.dispatchEvent(new CustomEvent('selectionChanged', { detail: null }));
    this.dispatchEvent(new CustomEvent('sceneCleared'));
  }

  replaceObjects(meshA, meshB, result) {
    this.scene.remove(meshA);
    this.scene.remove(meshB);
    const idxA = this.objects.indexOf(meshA);
    if (idxA !== -1) this.objects.splice(idxA, 1);
    const idxB = this.objects.indexOf(meshB);
    if (idxB !== -1) this.objects.splice(idxB, 1);
    meshA.geometry.dispose();
    if (meshA.material.dispose) meshA.material.dispose();
    meshB.geometry.dispose();
    if (meshB.material.dispose) meshB.material.dispose();

    this.addObjectDirect(result);
    this.history.clear();
  }

  getObjects() {
    return this.objects;
  }
}
