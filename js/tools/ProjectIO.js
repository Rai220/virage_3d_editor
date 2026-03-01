import * as THREE from 'three';

const GEOMETRY_BUILDERS = {
  BoxGeometry: (p) => new THREE.BoxGeometry(p.width, p.height, p.depth, p.widthSegments, p.heightSegments, p.depthSegments),
  SphereGeometry: (p) => new THREE.SphereGeometry(p.radius, p.widthSegments, p.heightSegments),
  CylinderGeometry: (p) => new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, p.radialSegments, p.heightSegments, p.openEnded),
  ConeGeometry: (p) => new THREE.ConeGeometry(p.radius, p.height, p.radialSegments, p.heightSegments, p.openEnded),
  TorusGeometry: (p) => new THREE.TorusGeometry(p.radius, p.tube, p.radialSegments, p.tubularSegments),
};

export class ProjectIO {
  constructor(editor) {
    this.editor = editor;
  }

  save() {
    const data = {
      version: 1,
      objects: this.editor.getObjects().map((mesh) => {
        const geoJson = mesh.geometry.toJSON();
        return {
          name: mesh.name,
          position: mesh.position.toArray(),
          rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
          scale: mesh.scale.toArray(),
          color: mesh.material.color.getHex(),
          geometry: geoJson,
        };
      }),
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'virage-project.json';
    link.click();

    URL.revokeObjectURL(url);
  }

  load() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          this._loadData(data);
        } catch (err) {
          console.error('Failed to load project:', err);
        }
      };
      reader.readAsText(file);
    });

    input.click();
  }

  _loadData(data) {
    this.editor.clearScene();

    (data.objects || []).forEach((obj) => {
      let geometry;
      const geoJson = obj.geometry;

      const builder = GEOMETRY_BUILDERS[geoJson.type];
      if (builder) {
        geometry = builder(geoJson);
      } else if (geoJson.data) {
        geometry = this._parseBufferGeometry(geoJson.data);
      } else {
        console.warn('Unknown geometry type:', geoJson.type);
        geometry = new THREE.BoxGeometry(10, 10, 10);
      }

      const material = new THREE.MeshStandardMaterial({
        color: obj.color,
        roughness: 0.5,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = obj.name || 'object';
      mesh.position.fromArray(obj.position);
      mesh.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
      mesh.scale.fromArray(obj.scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.editor.addObject(mesh);
    });
  }

  _parseBufferGeometry(data) {
    const geometry = new THREE.BufferGeometry();

    if (data.index) {
      const indexArr = new (this._typedArray(data.index.type))(data.index.array);
      geometry.setIndex(new THREE.BufferAttribute(indexArr, 1));
    }

    if (data.attributes) {
      for (const [key, attr] of Object.entries(data.attributes)) {
        const arr = new (this._typedArray(attr.type))(attr.array);
        geometry.setAttribute(key, new THREE.BufferAttribute(arr, attr.itemSize, attr.normalized));
      }
    }

    return geometry;
  }

  _typedArray(type) {
    switch (type) {
      case 'Float32Array': return Float32Array;
      case 'Float64Array': return Float64Array;
      case 'Uint16Array': return Uint16Array;
      case 'Uint32Array': return Uint32Array;
      case 'Int16Array': return Int16Array;
      case 'Int32Array': return Int32Array;
      default: return Float32Array;
    }
  }
}
