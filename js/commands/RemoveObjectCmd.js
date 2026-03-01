export class RemoveObjectCmd {
  constructor(editor, mesh) {
    this.editor = editor;
    this.mesh = mesh;
  }

  execute() {
    this.editor.scene.remove(this.mesh);
    const idx = this.editor.objects.indexOf(this.mesh);
    if (idx !== -1) this.editor.objects.splice(idx, 1);
    if (this.editor.selected === this.mesh) {
      this.editor.select(null);
    }
    this.editor.dispatchEvent(new CustomEvent('objectRemoved', { detail: this.mesh }));
  }

  undo() {
    this.editor.scene.add(this.mesh);
    if (!this.editor.objects.includes(this.mesh)) {
      this.editor.objects.push(this.mesh);
    }
    this.editor.dispatchEvent(new CustomEvent('objectAdded', { detail: this.mesh }));
    this.editor.select(this.mesh);
  }
}
