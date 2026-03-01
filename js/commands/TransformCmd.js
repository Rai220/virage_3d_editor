export class TransformCmd {
  constructor(mesh, oldPos, oldRot, oldScale, newPos, newRot, newScale) {
    this.mesh = mesh;
    this.oldPos = oldPos.clone();
    this.oldRot = oldRot.clone();
    this.oldScale = oldScale.clone();
    this.newPos = newPos.clone();
    this.newRot = newRot.clone();
    this.newScale = newScale.clone();
  }

  execute() {
    this.mesh.position.copy(this.newPos);
    this.mesh.rotation.copy(this.newRot);
    this.mesh.scale.copy(this.newScale);
  }

  undo() {
    this.mesh.position.copy(this.oldPos);
    this.mesh.rotation.copy(this.oldRot);
    this.mesh.scale.copy(this.oldScale);
  }
}
