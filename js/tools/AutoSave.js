const DB_NAME = 'virage3d';
const STORE_NAME = 'autosave';
const DB_VERSION = 1;
const DEBOUNCE_MS = 1000;
const LS_KEY = 'virage3d_autosave'; // legacy localStorage key for migration

export class AutoSave {
  constructor(editor, viewport, projectIO) {
    this.editor = editor;
    this.viewport = viewport;
    this.projectIO = projectIO;
    this._suppressSave = false;
    this._timer = null;
    this._db = null;
    this._dbReady = this._openDB();

    this._scheduleSave = this._scheduleSave.bind(this);
    this._saveImmediate = this._saveImmediate.bind(this);

    const editorEvents = [
      'objectAdded', 'objectRemoved', 'sceneCleared',
      'historyChanged', 'selectionChanged', 'propertyChanged',
    ];
    editorEvents.forEach((evt) => editor.addEventListener(evt, this._scheduleSave));

    viewport.orbitControls.addEventListener('change', this._scheduleSave);

    // TransformControls drag changes object transforms but doesn't fire editor events
    viewport.transformControls.addEventListener('objectChange', this._scheduleSave);

    window.addEventListener('beforeunload', this._saveImmediate);
  }

  _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => {
        this._db = request.result;
        resolve();
      };
      request.onerror = () => {
        console.warn('AutoSave: failed to open IndexedDB');
        reject(request.error);
      };
    });
  }

  async restore() {
    try {
      await this._dbReady;

      let data = await this._readIDB();

      // Migrate from localStorage if IndexedDB is empty
      if (!data) {
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) {
            data = JSON.parse(raw);
            localStorage.removeItem(LS_KEY);
          }
        } catch (_) { /* ignore */ }
      }

      if (!data || !Array.isArray(data.objects)) return false;

      this._suppressSave = true;

      this.editor.clearScene();

      const meshes = this.projectIO.deserializeObjects(data);
      meshes.forEach((mesh) => this.editor.addObjectDirect(mesh));

      // Restore camera
      if (data.camera) {
        this.viewport.camera.position.fromArray(data.camera.position);
        this.viewport.orbitControls.target.fromArray(data.camera.target);
        this.viewport.orbitControls.update();
      }

      this.editor.select(null);
      this.viewport.transformControls.detach();
      this.editor.history.clear();

      this._suppressSave = false;
      return true;
    } catch (err) {
      console.warn('AutoSave: restore failed', err);
      this._suppressSave = false;
      return false;
    }
  }

  _readIDB() {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('scene');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  _scheduleSave() {
    if (this._suppressSave) return;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this._save(), DEBOUNCE_MS);
  }

  _saveImmediate() {
    if (this._suppressSave) return;
    clearTimeout(this._timer);
    this._save();
  }

  _save() {
    if (!this._db) return;
    try {
      const data = this.projectIO.serializeScene();

      data.camera = {
        position: this.viewport.camera.position.toArray(),
        target: this.viewport.orbitControls.target.toArray(),
      };

      const tx = this._db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(data, 'scene');
    } catch (err) {
      console.warn('AutoSave: save failed', err);
    }
  }
}
