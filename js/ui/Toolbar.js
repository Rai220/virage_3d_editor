export class Toolbar {
  constructor(editor, primitiveTool, viewport) {
    this.editor = editor;
    this.primitiveTool = primitiveTool;
    this.viewport = viewport;

    this._bindPrimitives();
    this._bindTransformModes();
    this._bindGridSize();
    this._bindKeyboard();
    this._bindDelete();
  }

  _bindPrimitives() {
    const btn = document.getElementById('btn-primitives');
    const dropdown = document.getElementById('primitives-dropdown');

    btn.addEventListener('click', () => {
      dropdown.classList.toggle('open');
    });

    dropdown.querySelectorAll('.dropdown-item').forEach((item) => {
      item.addEventListener('click', () => {
        const type = item.dataset.primitive;
        this.primitiveTool.create(type);
        dropdown.classList.remove('open');
        this._setStatus(`Создан: ${item.textContent}`);
      });
    });

    document.addEventListener('click', (e) => {
      if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });
  }

  _bindTransformModes() {
    const modes = {
      'btn-translate': 'translate',
      'btn-rotate': 'rotate',
      'btn-scale': 'scale',
    };

    Object.entries(modes).forEach(([id, mode]) => {
      document.getElementById(id).addEventListener('click', () => {
        this.viewport.setTransformMode(mode);
        document.querySelectorAll('.statusbar-btn').forEach((b) => b.classList.remove('active'));
        document.getElementById(id).classList.add('active');
      });
    });
  }

  _bindGridSize() {
    document.getElementById('grid-size').addEventListener('change', (e) => {
      this.primitiveTool.setGridSnap(parseInt(e.target.value, 10));
    });
  }

  _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'w') this.viewport.setTransformMode('translate');
      if (e.key === 'e') this.viewport.setTransformMode('rotate');
      if (e.key === 'r') this.viewport.setTransformMode('scale');
      if (e.key === 'Delete' && this.editor.selected) {
        this.editor.removeObject(this.editor.selected);
        this.viewport.transformControls.detach();
        this._setStatus('Объект удалён');
      }
    });
  }

  _bindDelete() {
    // Delete via keyboard is handled in _bindKeyboard
  }

  _setStatus(text) {
    document.getElementById('status-text').textContent = text;
  }
}
