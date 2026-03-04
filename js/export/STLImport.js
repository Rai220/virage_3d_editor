import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

export class STLImport {
  constructor(editor) {
    this.editor = editor;
    this.loader = new STLLoader();
  }

  import() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.stl';

    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      input.remove();
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const geometry = this.loader.parse(ev.target.result);
          geometry.computeVertexNormals();

          const material = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.5,
            metalness: 0.1,
          });

          const mesh = new THREE.Mesh(geometry, material);
          mesh.name = file.name.replace(/\.stl$/i, '');
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.editor.addObject(mesh);
        } catch (err) {
          console.error('Failed to import STL:', err);
        }
      };
      reader.readAsArrayBuffer(file);
    });

    input.click();
  }
}
