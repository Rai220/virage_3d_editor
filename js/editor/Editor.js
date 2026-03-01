import * as THREE from 'three';
import { CommandHistory } from '../commands/CommandHistory.js';
import { AddObjectCmd } from '../commands/AddObjectCmd.js';
import { RemoveObjectCmd } from '../commands/RemoveObjectCmd.js';
import { BooleanCmd } from '../commands/BooleanCmd.js';

const EMISSIVE_SELECTED = 0x222244;
const EMISSIVE_NONE = 0x000000;

export class Editor extends EventTarget {
  constructor() {
    super();
    this.scene = new THREE.Scene();
    this.objects = [];
    this.selected = null;
    this.selectedSet = new Set();
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
    this._clearHighlights();
    this.selectedSet.clear();
    this.selected = mesh;
    if (mesh) {
      mesh.material.emissive?.setHex(EMISSIVE_SELECTED);
      this.selectedSet.add(mesh);
    }
    this.dispatchEvent(new CustomEvent('selectionChanged', { detail: mesh }));
  }

  selectToggle(mesh) {
    if (!mesh) return;
    if (this.selectedSet.has(mesh)) {
      this.selectedSet.delete(mesh);
      mesh.material.emissive?.setHex(EMISSIVE_NONE);
      if (this.selected === mesh) {
        this.selected = this.selectedSet.size > 0 ? [...this.selectedSet][this.selectedSet.size - 1] : null;
      }
    } else {
      this.selectedSet.add(mesh);
      mesh.material.emissive?.setHex(EMISSIVE_SELECTED);
      this.selected = mesh;
    }
    this.dispatchEvent(new CustomEvent('selectionChanged', { detail: this.selected }));
  }

  selectAll() {
    this._clearHighlights();
    this.selectedSet.clear();
    this.objects.forEach((m) => {
      this.selectedSet.add(m);
      m.material.emissive?.setHex(EMISSIVE_SELECTED);
    });
    this.selected = this.objects.length > 0 ? this.objects[this.objects.length - 1] : null;
    this.dispatchEvent(new CustomEvent('selectionChanged', { detail: this.selected }));
  }

  removeSelected() {
    const toRemove = [...this.selectedSet];
    if (toRemove.length === 0) return 0;
    toRemove.forEach((m) => {
      const cmd = new RemoveObjectCmd(this, m);
      this.history.execute(cmd);
    });
    this.selectedSet.clear();
    this.selected = null;
    this.dispatchEvent(new CustomEvent('selectionChanged', { detail: null }));
    return toRemove.length;
  }

  _clearHighlights() {
    this.selectedSet.forEach((m) => {
      m.material.emissive?.setHex(EMISSIVE_NONE);
    });
    if (this.selected && !this.selectedSet.has(this.selected)) {
      this.selected.material.emissive?.setHex(EMISSIVE_NONE);
    }
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
    this.selectedSet.clear();
    this.history.clear();
    this.dispatchEvent(new CustomEvent('selectionChanged', { detail: null }));
    this.dispatchEvent(new CustomEvent('sceneCleared'));
  }

  replaceObjects(meshA, meshB, result) {
    const cmd = new BooleanCmd(this, meshA, meshB, result);
    this.history.execute(cmd);
  }

  getObjects() {
    return this.objects;
  }
}
