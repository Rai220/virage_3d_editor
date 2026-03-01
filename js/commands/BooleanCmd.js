export class BooleanCmd {
  constructor(editor, meshA, meshB, result) {
    this.editor = editor;
    this.meshA = meshA;
    this.meshB = meshB;
    this.result = result;
  }

  execute() {
    this.editor.scene.remove(this.meshA);
    this.editor.scene.remove(this.meshB);
    const idxA = this.editor.objects.indexOf(this.meshA);
    if (idxA !== -1) this.editor.objects.splice(idxA, 1);
    const idxB = this.editor.objects.indexOf(this.meshB);
    if (idxB !== -1) this.editor.objects.splice(idxB, 1);

    this.editor.scene.add(this.result);
    if (!this.editor.objects.includes(this.result)) {
      this.editor.objects.push(this.result);
    }
    this.editor.dispatchEvent(new CustomEvent('objectAdded', { detail: this.result }));
    this.editor.select(this.result);
  }

  undo() {
    this.editor.scene.remove(this.result);
    const idx = this.editor.objects.indexOf(this.result);
    if (idx !== -1) this.editor.objects.splice(idx, 1);

    this.editor.scene.add(this.meshA);
    if (!this.editor.objects.includes(this.meshA)) {
      this.editor.objects.push(this.meshA);
    }
    this.editor.scene.add(this.meshB);
    if (!this.editor.objects.includes(this.meshB)) {
      this.editor.objects.push(this.meshB);
    }
    this.editor.dispatchEvent(new CustomEvent('objectAdded', { detail: this.meshA }));
    this.editor.select(this.meshA);
  }
}
