import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';

const RESULT_COLOR = 0x4a90d9;

export class BooleanTool {
  constructor(editor) {
    this.editor = editor;
    this.evaluator = new Evaluator();
  }

  union(meshA, meshB) {
    return this._evaluate(meshA, meshB, ADDITION, 'union');
  }

  subtract(meshA, meshB) {
    return this._evaluate(meshA, meshB, SUBTRACTION, 'subtraction');
  }

  intersect(meshA, meshB) {
    return this._evaluate(meshA, meshB, INTERSECTION, 'intersection');
  }

  _evaluate(meshA, meshB, operation, opName) {
    const brushA = new Brush(meshA.geometry.clone(), meshA.material.clone());
    brushA.position.copy(meshA.position);
    brushA.rotation.copy(meshA.rotation);
    brushA.scale.copy(meshA.scale);
    brushA.updateMatrixWorld(true);

    const brushB = new Brush(meshB.geometry.clone(), meshB.material.clone());
    brushB.position.copy(meshB.position);
    brushB.rotation.copy(meshB.rotation);
    brushB.scale.copy(meshB.scale);
    brushB.updateMatrixWorld(true);

    const result = this.evaluator.evaluate(brushA, brushB, operation);

    const material = new THREE.MeshStandardMaterial({
      color: RESULT_COLOR,
      roughness: 0.5,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(result.geometry, material);
    mesh.name = opName;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Center the geometry so mesh.position sits at its visual center (gizmo will appear there)
    const box = new THREE.Box3().setFromBufferGeometry(mesh.geometry);
    const center = box.getCenter(new THREE.Vector3());
    mesh.geometry.translate(-center.x, -center.y, -center.z);
    mesh.position.copy(center);

    this.editor.replaceObjects(meshA, meshB, mesh);
    return mesh;
  }
}
