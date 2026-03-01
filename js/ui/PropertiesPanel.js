export class PropertiesPanel {
  constructor(editor) {
    this.editor = editor;
    this.container = document.getElementById('properties-content');

    editor.addEventListener('selectionChanged', () => {
      this._render();
    });
  }

  _colorToHex(color) {
    return '#' + color.getHexString();
  }

  _render() {
    const set = this.editor.selectedSet;
    const mesh = this.editor.selected;

    if (set.size === 0 || !mesh) {
      this.container.innerHTML = '<p class="hint">Выберите объект для редактирования</p>';
      return;
    }

    if (set.size > 1) {
      this._renderMulti(set);
    } else {
      this._renderSingle(mesh);
    }
  }

  _renderMulti(set) {
    this.container.innerHTML = `
      <div class="prop-group">
        <label>Выбрано объектов: <strong>${set.size}</strong></label>
      </div>
      <div class="prop-group">
        <label>Цвет (для всех)</label>
        <div class="prop-row color-row">
          <input type="color" id="prop-color-multi" value="#4a90d9">
          <span class="color-value">#4a90d9</span>
        </div>
      </div>
      <p class="hint">Shift+клик — добавить/убрать объект из выделения</p>
    `;

    const colorInput = this.container.querySelector('#prop-color-multi');
    const colorValue = this.container.querySelector('.color-value');

    colorInput.addEventListener('input', () => {
      set.forEach((m) => {
        m.material.color.set(colorInput.value);
      });
      colorValue.textContent = colorInput.value;
    });
  }

  _renderSingle(mesh) {
    const currentColor = this._colorToHex(mesh.material.color);

    this.container.innerHTML = `
      <div class="prop-group">
        <label>Тип: <strong>${mesh.name || 'Объект'}</strong></label>
      </div>
      <div class="prop-group">
        <label>Цвет</label>
        <div class="prop-row color-row">
          <input type="color" id="prop-color" value="${currentColor}">
          <span class="color-value">${currentColor}</span>
        </div>
      </div>
      <div class="prop-group">
        <label>Позиция</label>
        <div class="prop-row">
          <span class="axis-x">X:</span>
          <input type="number" step="1" value="${mesh.position.x.toFixed(1)}" data-axis="px">
        </div>
        <div class="prop-row">
          <span class="axis-y">Y:</span>
          <input type="number" step="1" value="${mesh.position.y.toFixed(1)}" data-axis="py">
        </div>
        <div class="prop-row">
          <span class="axis-z">Z:</span>
          <input type="number" step="1" value="${mesh.position.z.toFixed(1)}" data-axis="pz">
        </div>
      </div>
      <div class="prop-group">
        <label>Вращение (°)</label>
        <div class="prop-row">
          <span class="axis-x">X:</span>
          <input type="number" step="1" value="${(mesh.rotation.x * 180 / Math.PI).toFixed(1)}" data-axis="rx">
        </div>
        <div class="prop-row">
          <span class="axis-y">Y:</span>
          <input type="number" step="1" value="${(mesh.rotation.y * 180 / Math.PI).toFixed(1)}" data-axis="ry">
        </div>
        <div class="prop-row">
          <span class="axis-z">Z:</span>
          <input type="number" step="1" value="${(mesh.rotation.z * 180 / Math.PI).toFixed(1)}" data-axis="rz">
        </div>
      </div>
      <div class="prop-group">
        <label>Масштаб</label>
        <div class="prop-row">
          <span class="axis-x">X:</span>
          <input type="number" step="0.1" value="${mesh.scale.x.toFixed(2)}" data-axis="sx">
        </div>
        <div class="prop-row">
          <span class="axis-y">Y:</span>
          <input type="number" step="0.1" value="${mesh.scale.y.toFixed(2)}" data-axis="sy">
        </div>
        <div class="prop-row">
          <span class="axis-z">Z:</span>
          <input type="number" step="0.1" value="${mesh.scale.z.toFixed(2)}" data-axis="sz">
        </div>
      </div>
    `;

    const colorInput = this.container.querySelector('#prop-color');
    const colorValue = this.container.querySelector('.color-value');

    colorInput.addEventListener('input', () => {
      mesh.material.color.set(colorInput.value);
      colorValue.textContent = colorInput.value;
    });

    this.container.querySelectorAll('input[type="number"]').forEach((input) => {
      input.addEventListener('change', () => {
        const val = parseFloat(input.value);
        const axis = input.dataset.axis;
        if (axis === 'px') mesh.position.x = val;
        if (axis === 'py') mesh.position.y = val;
        if (axis === 'pz') mesh.position.z = val;
        if (axis === 'rx') mesh.rotation.x = val * Math.PI / 180;
        if (axis === 'ry') mesh.rotation.y = val * Math.PI / 180;
        if (axis === 'rz') mesh.rotation.z = val * Math.PI / 180;
        if (axis === 'sx') mesh.scale.x = val;
        if (axis === 'sy') mesh.scale.y = val;
        if (axis === 'sz') mesh.scale.z = val;
      });
    });
  }
}
