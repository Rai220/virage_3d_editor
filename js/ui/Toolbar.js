import { TransformCmd } from '../commands/TransformCmd.js';

export class Toolbar {
  constructor(editor, primitiveTool, viewport, booleanTool, projectIO, stlExport, stlImport) {
    this.editor = editor;
    this.primitiveTool = primitiveTool;
    this.viewport = viewport;
    this.booleanTool = booleanTool;
    this.projectIO = projectIO;
    this.stlExport = stlExport;
    this.stlImport = stlImport;

    this._booleanMode = null;

    this._bindPrimitives();
    this._bindBooleanOps();
    this._bindDeleteButton();
    this._bindDropToTable();
    this._bindSaveLoad();
    this._bindExportImport();
    this._bindUndoRedo();
    this._bindTransformModes();
    this._bindTransformRecording();
    this._bindGridSize();
    this._bindViewToggles();
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
    const ops = {
      'btn-boolean-union': 'union',
      'btn-boolean-subtract': 'subtract',
      'btn-boolean-intersect': 'intersect',
    };

    Object.entries(ops).forEach(([id, mode]) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => this._startBooleanMode(mode));
      }
    });
  }

  _startBooleanMode(mode) {
    const objects = this.editor.getObjects();
    const selected = this.editor.selected;
    const set = this.editor.selectedSet;

    if (objects.length < 2) {
      this._setStatus('Нужно минимум 2 объекта для булевой операции');
      return;
    }

    if (!selected) {
      this._setStatus('Сначала выберите основной объект (кликните по нему)');
      return;
    }

    if (set.size === 2) {
      const arr = [...set];
      const base = arr[0];
      const target = arr[1];
      const statusLabels = { union: 'Объединение', subtract: 'Вычитание', intersect: 'Пересечение' };
      try {
        if (mode === 'union') this.booleanTool.union(base, target);
        else if (mode === 'subtract') this.booleanTool.subtract(base, target);
        else this.booleanTool.intersect(base, target);
        this._setStatus(`${statusLabels[mode]} выполнено`);
      } catch (err) {
        console.error('Boolean operation failed:', err);
        this._setStatus('Ошибка булевой операции — проверьте пересечение объектов');
      }
      return;
    }

    this._booleanMode = { mode, baseObject: selected };
    const labels = { union: 'объединения', subtract: 'вычитания', intersect: 'пересечения' };
    this._setStatus(`Кликните по второму объекту для ${labels[mode]}`);

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

        const statusLabels = { union: 'Объединение', subtract: 'Вычитание', intersect: 'Пересечение' };

        try {
          if (boolMode === 'union') {
            this.booleanTool.union(base, target);
          } else if (boolMode === 'subtract') {
            this.booleanTool.subtract(base, target);
          } else {
            this.booleanTool.intersect(base, target);
          }
          this._setStatus(`${statusLabels[boolMode]} выполнено`);
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

  _deleteSelected() {
    const count = this.editor.removeSelected();
    if (count === 0) {
      this._setStatus('Нет выбранного объекта для удаления');
      return;
    }
    this.viewport.transformControls.detach();
    this._setStatus(count > 1 ? `Удалено объектов: ${count}` : 'Объект удалён');
  }

  _bindDeleteButton() {
    const btn = document.getElementById('btn-delete');
    if (btn) {
      btn.addEventListener('click', () => {
        this._cancelBooleanMode();
        this._deleteSelected();
      });
    }

    const clearBtn = document.getElementById('btn-clear-all');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this._cancelBooleanMode();
        if (this.editor.getObjects().length === 0) {
          this._setStatus('Сцена уже пуста');
          return;
        }
        this.editor.clearScene();
        this.viewport.transformControls.detach();
        this._setStatus('Сцена очищена');
      });
    }
  }

  _bindDropToTable() {
    const btn = document.getElementById('btn-drop-to-table');
    if (btn) {
      btn.addEventListener('click', () => {
        if (this.editor.selectedSet.size === 0) {
          this._setStatus('Выберите объект для размещения на столе');
          return;
        }
        this.viewport.dropSelectedToTable();
        this._setStatus('Объект размещён на столе');
      });
    }
  }

  _bindViewToggles() {
    const snapBtn = document.getElementById('btn-toggle-snap');
    if (snapBtn) {
      snapBtn.addEventListener('click', () => {
        const on = this.viewport.toggleSnap();
        snapBtn.classList.toggle('active', on);
        this._setStatus(on ? 'Прилипание включено' : 'Прилипание выключено');
      });
    }

    const tableBtn = document.getElementById('btn-toggle-table');
    if (tableBtn) {
      tableBtn.addEventListener('click', () => {
        const on = this.viewport.toggleBuildPlate();
        tableBtn.classList.toggle('active', on);
        this._setStatus(on ? 'Стол показан' : 'Стол скрыт');
      });
    }
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

  _bindExportImport() {
    const exportBtn = document.getElementById('btn-export');
    const importBtn = document.getElementById('btn-import-stl');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this._cancelBooleanMode();
        if (this.stlExport.export()) {
          this._setStatus('STL экспортирован');
        } else {
          this._setStatus('Нет объектов для экспорта');
        }
      });
    }

    if (importBtn) {
      importBtn.addEventListener('click', () => {
        this._cancelBooleanMode();
        this.stlImport.import();
        this._setStatus('Импорт STL…');
      });
    }
  }

  _bindUndoRedo() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');

    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        if (this.editor.undo()) {
          this.viewport.transformControls.detach();
          this._setStatus('Отменено');
        }
      });
    }

    if (redoBtn) {
      redoBtn.addEventListener('click', () => {
        if (this.editor.redo()) {
          this.viewport.transformControls.detach();
          this._setStatus('Повторено');
        }
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
        this._setTransformModeUI(mode, id);
      });
    });
  }

  _setTransformModeUI(mode, btnId) {
    this.viewport.setTransformMode(mode);
    document.querySelectorAll('.statusbar-btn').forEach((b) => b.classList.remove('active'));
    if (btnId) document.getElementById(btnId).classList.add('active');
  }

  _bindTransformRecording() {
    let oldPos, oldRot, oldScale, activeMesh;

    this.viewport.transformControls.addEventListener('mouseDown', () => {
      activeMesh = this.viewport.transformControls.object;
      if (!activeMesh) return;
      oldPos = activeMesh.position.clone();
      oldRot = activeMesh.rotation.clone();
      oldScale = activeMesh.scale.clone();
    });

    this.viewport.transformControls.addEventListener('mouseUp', () => {
      if (!activeMesh || !oldPos) return;
      const cmd = new TransformCmd(
        activeMesh, oldPos, oldRot, oldScale,
        activeMesh.position.clone(), activeMesh.rotation.clone(), activeMesh.scale.clone()
      );
      this.editor.history.undoStack.push(cmd);
      this.editor.history.redoStack = [];
      activeMesh = null;
      oldPos = null;
      this.editor.dispatchEvent(new CustomEvent('selectionChanged', { detail: this.editor.selected }));
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

      // Undo: Ctrl+Z
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (this.editor.undo()) {
          this.viewport.transformControls.detach();
          this._setStatus('Отменено');
        }
        return;
      }

      // Redo: Ctrl+Shift+Z
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        if (this.editor.redo()) {
          this.viewport.transformControls.detach();
          this._setStatus('Повторено');
        }
        return;
      }

      // Select All: Ctrl+A
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        this.editor.selectAll();
        this._setStatus(`Выбрано объектов: ${this.editor.selectedSet.size}`);
        return;
      }

      // Duplicate: Ctrl+D
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        const dup = this.editor.duplicateSelected();
        if (dup) {
          this.viewport.transformControls.attach(dup);
          this._setStatus('Дубликат создан');
        }
        return;
      }

      // Save: Ctrl+S
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.projectIO.save();
        this._setStatus('Проект сохранён');
        return;
      }

      // Export STL: Ctrl+E
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        if (this.stlExport.export()) {
          this._setStatus('STL экспортирован');
        }
        return;
      }

      // Focus: F
      if (e.key === 'f') {
        this.viewport.focusSelected();
        return;
      }

      // Drop to table: G
      if (e.key === 'g') {
        if (this.editor.selectedSet.size > 0) {
          this.viewport.dropSelectedToTable();
          this._setStatus('Объект размещён на столе');
        }
        return;
      }

      // Transform modes
      if (e.key === 'w') this._setTransformModeUI('translate', 'btn-translate');
      if (e.key === 'e') this._setTransformModeUI('rotate', 'btn-rotate');
      if (e.key === 'r') this._setTransformModeUI('scale', 'btn-scale');

      // Escape
      if (e.key === 'Escape') this._cancelBooleanMode();

      // Delete / Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.editor.selectedSet.size > 0) {
        e.preventDefault();
        this._deleteSelected();
      }

      // Camera views: 1-6
      const viewMap = { '1': 'front', '2': 'back', '3': 'left', '4': 'right', '5': 'top', '6': 'bottom' };
      if (viewMap[e.key]) {
        this.viewport.setCameraView(viewMap[e.key]);
        const viewNames = { front: 'Спереди', back: 'Сзади', left: 'Слева', right: 'Справа', top: 'Сверху', bottom: 'Снизу' };
        this._setStatus(`Вид: ${viewNames[viewMap[e.key]]}`);
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
