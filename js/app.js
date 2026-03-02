import { Editor } from './editor/Editor.js';
import { Viewport } from './editor/Viewport.js';
import { PrimitiveTool } from './tools/PrimitiveTool.js';
import { BooleanTool } from './tools/BooleanTool.js';
import { ProjectIO } from './tools/ProjectIO.js';
import { AutoSave } from './tools/AutoSave.js';
import { STLExport } from './export/STLExport.js';
import { STLImport } from './export/STLImport.js';
import { Toolbar } from './ui/Toolbar.js';
import { PropertiesPanel } from './ui/PropertiesPanel.js';

async function init() {
  const canvas = document.getElementById('viewport');
  const editor = new Editor();
  const viewport = new Viewport(canvas, editor);
  const primitiveTool = new PrimitiveTool(editor);
  const booleanTool = new BooleanTool(editor);
  const projectIO = new ProjectIO(editor);
  const stlExport = new STLExport(editor);
  const stlImport = new STLImport(editor);

  new Toolbar(editor, primitiveTool, viewport, booleanTool, projectIO, stlExport, stlImport);
  new PropertiesPanel(editor);

  const autoSave = new AutoSave(editor, viewport, projectIO);
  const restored = await autoSave.restore();

  if (!restored) {
    // starter scene (first launch or empty localStorage)
    const box = primitiveTool.create('box');
    box.position.set(-15, 5, 0);

    const sphere = primitiveTool.create('sphere');
    sphere.position.set(0, 5, 0);

    const cyl = primitiveTool.create('cylinder');
    cyl.position.set(15, 5, 0);

    editor.select(null);
    viewport.transformControls.detach();
    editor.history.clear();
  }

  document.getElementById('status-text').textContent = 'Готово — Virage 3D Editor';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
