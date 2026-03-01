import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

export class STLExport {
  constructor(editor) {
    this.editor = editor;
    this.exporter = new STLExporter();
  }

  export() {
    const objects = this.editor.getObjects();
    if (objects.length === 0) return false;

    const exportScene = new THREE.Scene();
    objects.forEach((mesh) => {
      const clone = mesh.clone();
      clone.material = mesh.material.clone();
      exportScene.add(clone);
    });

    const buffer = this.exporter.parse(exportScene, { binary: true });
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'virage-model.stl';
    link.click();

    URL.revokeObjectURL(url);
    return true;
  }
}
