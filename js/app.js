import { Editor } from './editor/Editor.js';
import { Viewport } from './editor/Viewport.js';
import { PrimitiveTool } from './tools/PrimitiveTool.js';
import { BooleanTool } from './tools/BooleanTool.js';
import { ProjectIO } from './tools/ProjectIO.js';
import { STLExport } from './export/STLExport.js';
import { STLImport } from './export/STLImport.js';
import { Toolbar } from './ui/Toolbar.js';
import { PropertiesPanel } from './ui/PropertiesPanel.js';

function init() {
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

  document.getElementById('status-text').textContent = 'Готово — Virage 3D Editor';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
