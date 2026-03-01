export class Toolbar {
  constructor(editor, primitiveTool, viewport, booleanTool, projectIO) {
    this.editor = editor;
    this.primitiveTool = primitiveTool;
    this.viewport = viewport;
    this.booleanTool = booleanTool;
    this.projectIO = projectIO;

    this._booleanMode = null;

    this._bindPrimitives();
    this._bindBooleanOps();
    this._bindSaveLoad();
    this._bindTransformModes();
    this._bindGridSize();
    this._bindKeyboard();
    this._bindDelete();
  }

  _bindPrimitives() {
    const primitiveNames = {
      box: 'Куб',
      sphere: 'Сфера',
      cylinder: 'Цилиндр',
      cone: 'Конус',
      torus: 'Тор',
    };

    Object.keys(primitiveNames).forEach((type) => {
      const btn = document.getElementById(`btn-prim-${type}`);
      if (!btn) return;
      btn.addEventListener('click', () => {
        this._cancelBooleanMode();
        this.primitiveTool.create(type);
        this._setStatus(`Создан: ${primitiveNames[type]}`);
      });
    });
  }

  _bindBooleanOps() {
    const unionBtn = document.getElementById('btn-boolean-union');
    const subtractBtn = document.getElementById('btn-boolean-subtract');

    if (unionBtn) {
      unionBtn.addEventListener('click', () => {
        this._startBooleanMode('union');
      });
    }

    if (subtractBtn) {
      subtractBtn.addEventListener('click', () => {
        this._startBooleanMode('subtract');
      });
    }
  }

  _startBooleanMode(mode) {
    const objects = this.editor.getObjects();
    const selected = this.editor.selected;

    if (objects.length < 2) {
      this._setStatus('Нужно минимум 2 объекта для булевой операции');
      return;
    }

    if (!selected) {
      this._setStatus('Сначала выберите основной объект (кликните по нему)');
      return;
    }

    this._booleanMode = { mode, baseObject: selected };
    const label = mode === 'union' ? 'объединения' : 'вычитания';
    this._setStatus(`Кликните по второму объекту для ${label}`);

    this._booleanClickHandler = (e) => {
      if (!this._booleanMode) return;

      const dx = e.clientX - (this.viewport._pointerDownPos?.x ?? e.clientX);
      const dy = e.clientY - (this.viewport._pointerDownPos?.y ?? e.clientY);
      if (Math.sqrt(dx * dx + dy * dy) > 5) return;

      const rect = this.viewport.canvas.getBoundingClientRect();
      const mouse = this.viewport.mouse.clone();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.viewport.raycaster.setFromCamera(mouse, this.viewport.camera);
      const intersects = this.viewport.raycaster.intersectObjects(this.editor.getObjects());

      const hit = intersects.find((i) => i.object !== this._booleanMode.baseObject);
      if (hit) {
        const target = hit.object;

        const base = this._booleanMode.baseObject;
        const boolMode = this._booleanMode.mode;
        this._cancelBooleanMode();

        try {
          if (boolMode === 'union') {
            this.booleanTool.union(base, target);
            this._setStatus('Объединение выполнено');
          } else {
            this.booleanTool.subtract(base, target);
            this._setStatus('Вычитание выполнено');
          }
        } catch (err) {
          console.error('Boolean operation failed:', err);
          this._setStatus('Ошибка булевой операции — проверьте пересечение объектов');
        }
      }
    };

    this.viewport.canvas.addEventListener('pointerup', this._booleanClickHandler, { once: false });
  }

  _cancelBooleanMode() {
    if (this._booleanClickHandler) {
      this.viewport.canvas.removeEventListener('pointerup', this._booleanClickHandler);
      this._booleanClickHandler = null;
    }
    this._booleanMode = null;
  }

  _bindSaveLoad() {
    const saveBtn = document.getElementById('btn-save');
    const loadBtn = document.getElementById('btn-load');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this._cancelBooleanMode();
        this.projectIO.save();
        this._setStatus('Проект сохранён');
      });
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        this._cancelBooleanMode();
        this.projectIO.load();
        this._setStatus('Проект загружен');
      });
    }
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
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'w') this.viewport.setTransformMode('translate');
      if (e.key === 'e') this.viewport.setTransformMode('rotate');
      if (e.key === 'r') this.viewport.setTransformMode('scale');
      if (e.key === 'Escape') this._cancelBooleanMode();
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
