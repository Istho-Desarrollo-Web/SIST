# Grilla de Calificación y Campos Condicionales — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar el tipo de campo `grilla` (tabla con filas/columnas configurables y observaciones opcionales) y lógica de visibilidad condicional para campos y secciones basada en reglas combinables con operadores Y/O.

**Architecture:** Tres migraciones extienden las tablas existentes sin nuevas tablas. La grilla reutiliza la columna `opciones JSON` ya presente en `formulario_campos`. Las condiciones se almacenan como `condiciones JSON NULL` en `formulario_campos` y `formulario_secciones`. La evaluación ocurre en el cliente (hook `useCondicionales`) y se replica en el servidor para validar campos requeridos y descartar valores ocultos.

**Tech Stack:** React 19, Tailwind CSS v4, Lucide React, Node.js, Express 5, Sequelize 6, MySQL 8, pdf-lib

---

## Mapa de archivos

| Archivo | Acción |
|---------|--------|
| `server/src/migrations/20260604000016-add-grilla-to-tipo-enum.js` | Crear |
| `server/src/migrations/20260604000017-add-condiciones-to-formulario-campos.js` | Crear |
| `server/src/migrations/20260604000018-add-condiciones-to-formulario-secciones.js` | Crear |
| `server/src/models/FormularioCampo.js` | Modificar — añadir `grilla` al ENUM y campo `condiciones` |
| `server/src/models/FormularioSeccion.js` | Modificar — añadir campo `condiciones` |
| `server/src/controllers/formularioController.js` | Modificar — persistir `condiciones` en `guardarCampos` |
| `server/src/controllers/formularioRespuestaController.js` | Modificar — almacenar grilla como JSON, filtrar campos ocultos, validar requeridos por visibilidad |
| `server/src/services/pdfService.js` | Modificar — renderizar grilla como tabla en PDF |
| `client/src/components/formularios/useCondicionales.js` | Crear — hook de evaluación de condiciones |
| `client/src/components/formularios/CampoEditorModal.jsx` | Modificar — panel grilla + panel condicionales |
| `client/src/components/formularios/CamposList.jsx` | Modificar — pasar `camposDelFormulario` al modal y a SeccionItem |
| `client/src/components/formularios/SeccionItem.jsx` | Modificar — panel condicionales para secciones |
| `client/src/components/formularios/FormularioRenderer.jsx` | Modificar — componente `CampoGrilla` + props de filtrado condicional |
| `client/src/pages/FormularioResponderPage.jsx` | Modificar — integrar `useCondicionales`, limpiar valores ocultos, filtrar al enviar |

---

## Task 1: Migraciones de base de datos

**Files:**
- Create: `soporte-ti-istho/server/src/migrations/20260604000016-add-grilla-to-tipo-enum.js`
- Create: `soporte-ti-istho/server/src/migrations/20260604000017-add-condiciones-to-formulario-campos.js`
- Create: `soporte-ti-istho/server/src/migrations/20260604000018-add-condiciones-to-formulario-secciones.js`

- [ ] **Step 1: Crear migración — añadir `grilla` al ENUM**

```js
// soporte-ti-istho/server/src/migrations/20260604000016-add-grilla-to-tipo-enum.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.changeColumn('formulario_campos', 'tipo', {
      type: DataTypes.ENUM(
        'texto_corto', 'texto_largo', 'numero', 'fecha',
        'seleccion_unica', 'seleccion_multiple', 'archivo', 'firma', 'grilla'
      ),
      allowNull: false,
    });
  },
  async down(queryInterface) {
    await queryInterface.changeColumn('formulario_campos', 'tipo', {
      type: DataTypes.ENUM(
        'texto_corto', 'texto_largo', 'numero', 'fecha',
        'seleccion_unica', 'seleccion_multiple', 'archivo', 'firma'
      ),
      allowNull: false,
    });
  },
};
```

- [ ] **Step 2: Crear migración — añadir `condiciones` a `formulario_campos`**

```js
// soporte-ti-istho/server/src/migrations/20260604000017-add-condiciones-to-formulario-campos.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn('formulario_campos', 'condiciones', {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('formulario_campos', 'condiciones');
  },
};
```

- [ ] **Step 3: Crear migración — añadir `condiciones` a `formulario_secciones`**

```js
// soporte-ti-istho/server/src/migrations/20260604000018-add-condiciones-to-formulario-secciones.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn('formulario_secciones', 'condiciones', {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('formulario_secciones', 'condiciones');
  },
};
```

- [ ] **Step 4: Aplicar migraciones**

```bash
cd soporte-ti-istho/server
npm run db:migrate
```

Salida esperada: `3 migrations executed successfully` (o similar con las tres nuevas).

- [ ] **Step 5: Commit**

```bash
git add soporte-ti-istho/server/src/migrations/20260604000016-add-grilla-to-tipo-enum.js
git add soporte-ti-istho/server/src/migrations/20260604000017-add-condiciones-to-formulario-campos.js
git add soporte-ti-istho/server/src/migrations/20260604000018-add-condiciones-to-formulario-secciones.js
git commit -m "feat: migrations for grilla ENUM + condiciones columns"
```

---

## Task 2: Actualizar modelos Sequelize

**Files:**
- Modify: `soporte-ti-istho/server/src/models/FormularioCampo.js`
- Modify: `soporte-ti-istho/server/src/models/FormularioSeccion.js`

- [ ] **Step 1: Actualizar `FormularioCampo.js` — añadir `grilla` al ENUM y campo `condiciones`**

Reemplazar el bloque `tipo` (líneas 19-25) y añadir `condiciones` después de `opciones` (línea 31):

```js
// soporte-ti-istho/server/src/models/FormularioCampo.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FormularioCampo extends Model {}

FormularioCampo.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  formularioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'formulario_id',
  },
  seccionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    field: 'seccion_id',
  },
  tipo: {
    type: DataTypes.ENUM(
      'texto_corto', 'texto_largo', 'numero', 'fecha',
      'seleccion_unica', 'seleccion_multiple', 'archivo', 'firma', 'grilla'
    ),
    allowNull: false,
  },
  etiqueta: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  placeholder: { type: DataTypes.STRING(200) },
  requerido: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  opciones: { type: DataTypes.JSON },
  condiciones: { type: DataTypes.JSON },
}, {
  sequelize,
  modelName: 'FormularioCampo',
  tableName: 'formulario_campos',
  underscored: true,
});

module.exports = FormularioCampo;
```

- [ ] **Step 2: Actualizar `FormularioSeccion.js` — añadir campo `condiciones`**

Añadir `condiciones` después de `visibleParaUsuario` (línea 20):

```js
// soporte-ti-istho/server/src/models/FormularioSeccion.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FormularioSeccion extends Model {}

FormularioSeccion.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  formularioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'formulario_id',
  },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  visibleParaUsuario: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'visible_para_usuario',
  },
  condiciones: { type: DataTypes.JSON },
}, {
  sequelize,
  modelName: 'FormularioSeccion',
  tableName: 'formulario_secciones',
  underscored: true,
});

module.exports = FormularioSeccion;
```

- [ ] **Step 3: Verificar que el servidor levanta sin errores**

```bash
cd soporte-ti-istho/server
npm run dev
```

Esperar: `Server running on port 5000` sin errores de Sequelize.

- [ ] **Step 4: Commit**

```bash
git add soporte-ti-istho/server/src/models/FormularioCampo.js
git add soporte-ti-istho/server/src/models/FormularioSeccion.js
git commit -m "feat: add grilla to ENUM and condiciones field to campo/seccion models"
```

---

## Task 3: Persistir `condiciones` en `guardarCampos`

**Files:**
- Modify: `soporte-ti-istho/server/src/controllers/formularioController.js:144-229`

- [ ] **Step 1: Actualizar upsert de secciones — añadir `condiciones`**

En la función `guardarCampos` (aprox. línea 170), reemplazar el objeto `data` para secciones:

```js
// Bloque original en guardarCampos, sección upsert secciones (~línea 170)
const data = {
  formularioId,
  nombre: sec.nombre,
  orden: sec.orden,
  visibleParaUsuario: Boolean(sec.visibleParaUsuario),
  condiciones: sec.condiciones || null,  // ← AÑADIR ESTA LÍNEA
};
```

- [ ] **Step 2: Actualizar upsert de campos — manejar `condiciones`**

En el `Promise.all` de campos (aprox. línea 204), añadir `condiciones` al objeto `data` al mismo nivel que `opciones`:

```js
// Dentro del map de campos, objeto data
const data = {
  ...c,
  formularioId,
  orden: i,
  seccionId: resolvedSeccionId,
  opciones: (() => {
    if (Array.isArray(c.opciones)) return c.opciones;
    if (!c.opciones) return null;
    try { return JSON.parse(c.opciones); }
    catch { return null; }
  })(),
  condiciones: (() => {
    if (!c.condiciones) return null;
    if (typeof c.condiciones === 'object') return c.condiciones;
    try { return JSON.parse(c.condiciones); } catch { return null; }
  })(),
};
```

- [ ] **Step 3: Verificar con curl que el endpoint acepta condiciones**

Iniciar servidor, luego:

```bash
curl -X POST http://localhost:5000/api/formularios/1/campos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -d '{"campos":[{"tipo":"texto_corto","etiqueta":"Campo A","requerido":false,"orden":0,"condiciones":{"operadorLogico":"Y","reglas":[]}}],"secciones":[]}'
```

Esperar: `{"success":true,"data":{"secciones":[],"campos":[...]}}` sin errores.

- [ ] **Step 4: Commit**

```bash
git add soporte-ti-istho/server/src/controllers/formularioController.js
git commit -m "feat: persist condiciones field in guardarCampos for campos and secciones"
```

---

## Task 4: Hook `useCondicionales`

**Files:**
- Create: `soporte-ti-istho/client/src/components/formularios/useCondicionales.js`

- [ ] **Step 1: Crear el hook**

```js
// soporte-ti-istho/client/src/components/formularios/useCondicionales.js
import { useMemo } from 'react';

function evaluar(condicion, valores) {
  if (!condicion || !condicion.reglas || condicion.reglas.length === 0) return true;
  const resultados = condicion.reglas.map(regla => {
    const val = valores[regla.campoId];
    const str = Array.isArray(val) ? val.join(', ') : String(val ?? '');
    switch (regla.operador) {
      case 'igual':         return str === String(regla.valor ?? '');
      case 'diferente':     return str !== String(regla.valor ?? '');
      case 'contiene':      return Array.isArray(val)
        ? val.includes(regla.valor)
        : str.includes(String(regla.valor ?? ''));
      case 'no_contiene':   return Array.isArray(val)
        ? !val.includes(regla.valor)
        : !str.includes(String(regla.valor ?? ''));
      case 'esta_vacio':    return !val
        || (Array.isArray(val) && val.length === 0)
        || str === '';
      case 'no_esta_vacio': return !!val
        && !(Array.isArray(val) && val.length === 0)
        && str !== '';
      default: return true;
    }
  });
  return condicion.operadorLogico === 'O'
    ? resultados.some(Boolean)
    : resultados.every(Boolean);
}

export function useCondicionales(campos, secciones, valores) {
  const camposVisibles = useMemo(() => {
    const set = new Set();
    for (const campo of campos) {
      if (!campo.condiciones || evaluar(campo.condiciones, valores)) {
        set.add(campo.id);
      }
    }
    return set;
  }, [campos, secciones, valores]);

  const seccionesVisibles = useMemo(() => {
    const set = new Set();
    for (const sec of secciones) {
      if (!sec.condiciones || evaluar(sec.condiciones, valores)) {
        set.add(sec.id);
      }
    }
    return set;
  }, [secciones, valores]);

  return { camposVisibles, seccionesVisibles };
}
```

- [ ] **Step 2: Verificar que el archivo existe y exporta correctamente**

```bash
node -e "const { useCondicionales } = require('./soporte-ti-istho/client/src/components/formularios/useCondicionales.js'); console.log(typeof useCondicionales)"
```

Esperar: `function`

- [ ] **Step 3: Commit**

```bash
git add soporte-ti-istho/client/src/components/formularios/useCondicionales.js
git commit -m "feat: add useCondicionales hook for evaluating field visibility rules"
```

---

## Task 5: `CampoEditorModal` — panel de configuración Grilla

**Files:**
- Modify: `soporte-ti-istho/client/src/components/formularios/CampoEditorModal.jsx`

- [ ] **Step 1: Añadir `grilla` a la lista de tipos y su icono import**

En CampoEditorModal.jsx, actualizar `TIPOS` (líneas 9-18) y añadir el estado de grilla:

```js
// Reemplazar bloque TIPOS completo (líneas 9-18)
const TIPOS = [
  { value: 'texto_corto',       label: 'Texto corto' },
  { value: 'texto_largo',       label: 'Texto largo' },
  { value: 'numero',            label: 'Número' },
  { value: 'fecha',             label: 'Fecha' },
  { value: 'seleccion_unica',   label: 'Selección única' },
  { value: 'seleccion_multiple', label: 'Selección múltiple' },
  { value: 'archivo',           label: 'Archivo adjunto' },
  { value: 'firma',             label: 'Firma digital' },
  { value: 'grilla',            label: 'Grilla de calificación' },
];
```

- [ ] **Step 2: Añadir estado para grilla al componente**

Después de la línea `const [opciones, setOpciones] = useState([]);` (línea 33), añadir:

```js
const [grillaColumnas, setGrillaColumnas] = useState(['B', 'R', 'M', 'N/A']);
const [grillaFilas, setGrillaFilas] = useState(['Fila 1']);
const [conObservaciones, setConObservaciones] = useState(false);
```

- [ ] **Step 3: Inicializar estado de grilla desde `campoInicial`**

En el `useEffect` (líneas 36-48), añadir inicialización de grilla después de `setOpciones(parsed)`:

```js
useEffect(() => {
  if (campoInicial) {
    reset(campoInicial);
    const raw = campoInicial.opciones;
    if (campoInicial.tipo === 'grilla' && raw && typeof raw === 'object' && !Array.isArray(raw)) {
      setGrillaColumnas(Array.isArray(raw.columnas) ? raw.columnas : ['B', 'R', 'M', 'N/A']);
      setGrillaFilas(Array.isArray(raw.filas) ? raw.filas : ['Fila 1']);
      setConObservaciones(Boolean(raw.conObservaciones));
      setOpciones([]);
    } else {
      let parsed = [];
      if (Array.isArray(raw)) parsed = raw;
      else if (typeof raw === 'string') {
        try { const r = JSON.parse(raw); if (Array.isArray(r)) parsed = r; } catch { /* noop */ }
      }
      setOpciones(parsed);
      setGrillaColumnas(['B', 'R', 'M', 'N/A']);
      setGrillaFilas(['Fila 1']);
      setConObservaciones(false);
    }
  } else {
    reset({ tipo: 'texto_corto', etiqueta: '', descripcion: '', placeholder: '', requerido: false, opciones: [] });
    setOpciones([]);
    setGrillaColumnas(['B', 'R', 'M', 'N/A']);
    setGrillaFilas(['Fila 1']);
    setConObservaciones(false);
  }
}, [campoInicial, reset, isOpen]);
```

- [ ] **Step 4: Actualizar `onSubmit` para empaquetar opciones de grilla**

Reemplazar la función `onSubmit` (líneas 65-68):

```js
function onSubmit(data) {
  let opcionesFinales;
  if (['seleccion_unica', 'seleccion_multiple'].includes(data.tipo)) {
    opcionesFinales = opciones;
  } else if (data.tipo === 'grilla') {
    opcionesFinales = { columnas: grillaColumnas, filas: grillaFilas, conObservaciones };
  } else {
    opcionesFinales = undefined;
  }
  onSave({ ...data, opciones: opcionesFinales });
  onClose();
}
```

- [ ] **Step 5: Añadir paneles de Columnas y Filas en el JSX**

Añadir esta variable para la condición:

```js
const esGrilla = tipo === 'grilla';
```

Añadir los paneles de grilla justo después del bloque `{necesitaOpciones && (...)}` (después de la línea 141) y antes del checkbox `requerido`:

```jsx
{esGrilla && (
  <>
    {/* Panel Columnas */}
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
        Columnas ({grillaColumnas.length}/8)
      </label>
      <div className="flex flex-col gap-1.5 mb-2">
        {grillaColumnas.map((col, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={col}
              onChange={e => {
                const next = [...grillaColumnas];
                next[i] = e.target.value;
                setGrillaColumnas(next);
              }}
              className="flex-1"
              placeholder={`Columna ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => setGrillaColumnas(grillaColumnas.filter((_, j) => j !== i))}
              disabled={grillaColumnas.length <= 1}
              className="text-slate-400 hover:text-red-500 disabled:opacity-30"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {grillaColumnas.length < 8 && (
        <button
          type="button"
          onClick={() => setGrillaColumnas([...grillaColumnas, ''])}
          className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Agregar columna
        </button>
      )}
    </div>

    {/* Panel Filas */}
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
        Filas ({grillaFilas.length}/50)
      </label>
      <div className="flex flex-col gap-1.5 mb-2">
        {grillaFilas.map((fila, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={fila}
              onChange={e => {
                const next = [...grillaFilas];
                next[i] = e.target.value;
                setGrillaFilas(next);
              }}
              className="flex-1"
              placeholder={`Fila ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => setGrillaFilas(grillaFilas.filter((_, j) => j !== i))}
              disabled={grillaFilas.length <= 1}
              className="text-slate-400 hover:text-red-500 disabled:opacity-30"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {grillaFilas.length < 50 && (
        <button
          type="button"
          onClick={() => setGrillaFilas([...grillaFilas, ''])}
          className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Agregar fila
        </button>
      )}
    </div>

    {/* Toggle observaciones */}
    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
      <input
        type="checkbox"
        checked={conObservaciones}
        onChange={e => setConObservaciones(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
      />
      Columna de observaciones
    </label>
  </>
)}
```

- [ ] **Step 6: Verificar en el navegador que aparece el tipo `grilla` en el selector**

Abrir `http://localhost:5173`, ir a un formulario en el builder, abrir el modal de nuevo campo y verificar que "Grilla de calificación" aparece en el select de tipo.

- [ ] **Step 7: Commit**

```bash
git add soporte-ti-istho/client/src/components/formularios/CampoEditorModal.jsx
git commit -m "feat: add grilla field type config panels to CampoEditorModal"
```

---

## Task 6: `CampoEditorModal` — panel de visibilidad condicional

**Files:**
- Modify: `soporte-ti-istho/client/src/components/formularios/CampoEditorModal.jsx`

El modal recibe una nueva prop `camposDelFormulario` (array) con los otros campos del formulario que tienen ID. Añade estado `condiciones` y un panel colapsable al final del formulario.

- [ ] **Step 1: Actualizar signatura del componente y añadir imports**

En la línea 1, actualizar imports para añadir `ChevronDown`, `ChevronRight`, `GitBranch`:

```js
import { useForm, Controller } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { Plus, X, ChevronDown, ChevronRight, GitBranch } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
```

Actualizar la signatura del componente (línea 20):

```js
export function CampoEditorModal({ isOpen, onClose, onSave, campoInicial, camposDelFormulario = [] }) {
```

- [ ] **Step 2: Añadir función auxiliar `toArray` y constantes de operadores**

Añadir antes del componente (antes de la línea 9 `const TIPOS`):

```js
function toArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } catch {}
  }
  return [];
}

const TIPOS_TRIGGER = ['seleccion_unica', 'seleccion_multiple', 'texto_corto', 'numero'];

const OPERADORES = [
  { value: 'igual',         label: 'es igual a' },
  { value: 'diferente',     label: 'es diferente a' },
  { value: 'contiene',      label: 'contiene' },
  { value: 'no_contiene',   label: 'no contiene' },
  { value: 'esta_vacio',    label: 'está vacío' },
  { value: 'no_esta_vacio', label: 'no está vacío' },
];
```

- [ ] **Step 3: Añadir estado `condiciones` y `panelCondicionesVisible`**

Después de los estados de grilla (Task 5, Step 2), añadir:

```js
const [condiciones, setCondiciones] = useState(null);
const [panelCondicionesVisible, setPanelCondicionesVisible] = useState(false);
```

- [ ] **Step 4: Inicializar estado `condiciones` desde `campoInicial` en el `useEffect`**

Al final del bloque del `if (campoInicial)` en el useEffect, después de los setters de grilla:

```js
if (campoInicial?.condiciones) {
  setCondiciones(campoInicial.condiciones);
  setPanelCondicionesVisible(true);
} else {
  setCondiciones(null);
  setPanelCondicionesVisible(false);
}
```

Y en el bloque `else` (reset), añadir:
```js
setCondiciones(null);
setPanelCondicionesVisible(false);
```

- [ ] **Step 5: Actualizar `onSubmit` para incluir `condiciones`**

Reemplazar la línea `onSave({ ...data, opciones: opcionesFinales });` por:

```js
onSave({ ...data, opciones: opcionesFinales, condiciones: condiciones || null });
```

- [ ] **Step 6: Añadir el componente `ReglaRow` antes de `CampoEditorModal`**

Añadir antes de la línea `export function CampoEditorModal`:

```jsx
function ReglaRow({ regla, camposDisponibles, onChange, onDelete }) {
  const campoSeleccionado = camposDisponibles.find(
    c => String(c.id) === String(regla.campoId)
  );
  const opcionesValor = campoSeleccionado ? toArray(campoSeleccionado.opciones) : [];
  const mostrarValor = !['esta_vacio', 'no_esta_vacio'].includes(regla.operador);

  return (
    <div className="flex flex-wrap items-start gap-1.5 p-2 rounded bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-600">
      <select
        value={String(regla.campoId || '')}
        onChange={e => onChange({ ...regla, campoId: e.target.value, valor: '' })}
        className="flex-1 min-w-[120px] text-xs rounded border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-800 text-slate-800 dark:text-slate-100 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
      >
        <option value="">Campo disparador...</option>
        {camposDisponibles.map(c => (
          <option key={c.id} value={String(c.id)}>{c.etiqueta}</option>
        ))}
      </select>

      <select
        value={regla.operador}
        onChange={e => onChange({ ...regla, operador: e.target.value })}
        className="flex-1 min-w-[120px] text-xs rounded border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-800 text-slate-800 dark:text-slate-100 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
      >
        {OPERADORES.map(op => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {mostrarValor && (
        opcionesValor.length > 0 ? (
          <select
            value={regla.valor || ''}
            onChange={e => onChange({ ...regla, valor: e.target.value })}
            className="flex-1 min-w-[100px] text-xs rounded border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-800 text-slate-800 dark:text-slate-100 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
          >
            <option value="">Valor...</option>
            {opcionesValor.map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={regla.valor || ''}
            onChange={e => onChange({ ...regla, valor: e.target.value })}
            placeholder="Valor..."
            className="flex-1 min-w-[100px] text-xs rounded border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-800 text-slate-800 dark:text-slate-100 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
          />
        )
      )}

      <button type="button" onClick={onDelete} className="text-slate-400 hover:text-red-500 p-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Añadir el panel condicionales en el JSX del modal**

Añadir justo antes del div de botones finales (`<div className="flex gap-2 pt-2">`):

```jsx
{/* Panel visibilidad condicional */}
{(() => {
  const camposDisponibles = camposDelFormulario.filter(
    c => c.id && TIPOS_TRIGGER.includes(c.tipo)
  );
  return (
    <div className="border border-slate-200 dark:border-navy-600 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setPanelCondicionesVisible(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-navy-900 hover:bg-slate-100 dark:hover:bg-navy-700"
      >
        <span className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5" />
          Visibilidad condicional
        </span>
        {panelCondicionesVisible
          ? <ChevronDown className="w-3.5 h-3.5" />
          : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {panelCondicionesVisible && (
        <div className="p-3 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={!!condiciones}
              onChange={e => setCondiciones(
                e.target.checked ? { operadorLogico: 'Y', reglas: [] } : null
              )}
              className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
            />
            Activar visibilidad condicional
          </label>

          {condiciones && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 dark:text-slate-400">Mostrar si se cumplen</span>
                <select
                  value={condiciones.operadorLogico}
                  onChange={e => setCondiciones({ ...condiciones, operadorLogico: e.target.value })}
                  className="text-xs rounded border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-800 text-slate-800 dark:text-slate-100 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                >
                  <option value="Y">TODAS las reglas</option>
                  <option value="O">ALGUNA regla</option>
                </select>
                <span className="text-xs text-slate-500 dark:text-slate-400">siguientes reglas:</span>
              </div>

              <div className="flex flex-col gap-2">
                {condiciones.reglas.map((regla, idx) => (
                  <ReglaRow
                    key={idx}
                    regla={regla}
                    camposDisponibles={camposDisponibles}
                    onChange={r => {
                      const reglas = [...condiciones.reglas];
                      reglas[idx] = r;
                      setCondiciones({ ...condiciones, reglas });
                    }}
                    onDelete={() => {
                      const reglas = condiciones.reglas.filter((_, i) => i !== idx);
                      setCondiciones({ ...condiciones, reglas });
                    }}
                  />
                ))}
                {condiciones.reglas.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                    Sin reglas — el campo siempre será visible
                  </p>
                )}
              </div>

              {condiciones.reglas.length < 10 && camposDisponibles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCondiciones({
                    ...condiciones,
                    reglas: [...condiciones.reglas, { campoId: '', operador: 'igual', valor: '' }],
                  })}
                  className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 self-start"
                >
                  <Plus className="w-3 h-3" />
                  Agregar regla
                </button>
              )}

              {camposDisponibles.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Guarda primero los demás campos para poder referenciarlos en reglas.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
})()}
```

- [ ] **Step 8: Verificar en el navegador**

Abrir el builder, crear un campo de tipo `seleccion_unica` con opciones, guardarlo (`Guardar campos`). Luego crear otro campo, abrir el panel "Visibilidad condicional", activarlo y verificar que el primer campo aparece como disparador disponible.

- [ ] **Step 9: Commit**

```bash
git add soporte-ti-istho/client/src/components/formularios/CampoEditorModal.jsx
git commit -m "feat: add conditional visibility rule builder to CampoEditorModal"
```

---

## Task 7: `CamposList` — conectar `camposDelFormulario` y condiciones de secciones

**Files:**
- Modify: `soporte-ti-istho/client/src/components/formularios/CamposList.jsx`

- [ ] **Step 1: Añadir ícono `LayoutGrid` a los imports y al mapa de íconos**

En las líneas de imports de lucide (líneas 18-21), añadir `LayoutGrid`:

```js
import {
  GripVertical, Pencil, Trash2, Plus, FolderPlus,
  Type, AlignLeft, Hash, Calendar, CircleDot, CheckSquare, Paperclip, PenLine, LayoutGrid,
} from 'lucide-react';
```

Actualizar `TIPO_ICONS` (líneas 26-35) para incluir grilla:

```js
const TIPO_ICONS = {
  texto_corto:       Type,
  texto_largo:       AlignLeft,
  numero:            Hash,
  fecha:             Calendar,
  seleccion_unica:   CircleDot,
  seleccion_multiple: CheckSquare,
  archivo:           Paperclip,
  firma:             PenLine,
  grilla:            LayoutGrid,
};
```

- [ ] **Step 2: Añadir handler `handleActualizarCondicionesSeccion`**

Después de `handleEliminarSeccion` (aprox. línea 234), añadir:

```js
function handleActualizarCondicionesSeccion(key, condiciones) {
  onChangeSecciones(secciones.map(s =>
    s._key === key ? { ...s, condiciones: condiciones || null } : s
  ));
}
```

- [ ] **Step 3: Pasar `camposDelFormulario` y `onActualizarCondiciones` a SeccionItem**

En el render de `SeccionItem` (aprox. línea 272), añadir las nuevas props:

```jsx
<SeccionItem
  key={seccion._key}
  seccion={seccion}
  campos={camposBySec[seccion._key] || []}
  onRenombrar={handleRenombrarSeccion}
  onToggleVisible={handleToggleVisible}
  onEliminar={handleEliminarSeccion}
  onActualizarCondiciones={handleActualizarCondicionesSeccion}
  camposDelFormulario={campos.filter(c => c.id)}
>
```

- [ ] **Step 4: Pasar `camposDelFormulario` a `CampoEditorModal`**

En el render de `CampoEditorModal` (aprox. línea 310), añadir la nueva prop:

```jsx
<CampoEditorModal
  isOpen={showModal}
  onClose={() => { setShowModal(false); setEditandoKey(null); }}
  onSave={handleSaveCampo}
  campoInicial={editandoCampo || null}
  camposDelFormulario={campos.filter(c => c.id && c._key !== editandoKey)}
/>
```

- [ ] **Step 5: Verificar que la app no tiene errores de consola**

Abrir `http://localhost:5173`, navegar al builder de un formulario y comprobar que no hay errores en la consola.

- [ ] **Step 6: Commit**

```bash
git add soporte-ti-istho/client/src/components/formularios/CamposList.jsx
git commit -m "feat: wire camposDelFormulario props and section conditions handler in CamposList"
```

---

## Task 8: `SeccionItem` — panel de visibilidad condicional

**Files:**
- Modify: `soporte-ti-istho/client/src/components/formularios/SeccionItem.jsx`

- [ ] **Step 1: Actualizar imports — añadir `GitBranch`, `ChevronDown`, `ChevronRight`**

Reemplazar la línea de imports de lucide (línea 4):

```js
import { ChevronDown, ChevronRight, Pencil, Trash2, Eye, EyeOff, Check, X, GitBranch } from 'lucide-react';
```

- [ ] **Step 2: Actualizar signatura para recibir nuevas props**

Reemplazar la definición del componente (líneas 6-12):

```js
export function SeccionItem({
  seccion,
  campos,
  onRenombrar,
  onToggleVisible,
  onEliminar,
  onActualizarCondiciones,
  camposDelFormulario = [],
  children,
}) {
```

- [ ] **Step 3: Añadir estado `panelCondicionesVisible`**

Después de `const [nombreDraft, setNombreDraft] = useState(seccion.nombre);` (línea 16), añadir:

```js
const [panelCondicionesVisible, setPanelCondicionesVisible] = useState(false);
```

- [ ] **Step 4: Añadir helpers `toArray`, `OPERADORES`, `TIPOS_TRIGGER` y el componente `ReglaRowSeccion`**

Añadir antes de `export function SeccionItem` (al inicio del archivo, después de los imports):

```js
function toArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } catch {}
  }
  return [];
}

const TIPOS_TRIGGER_SEC = ['seleccion_unica', 'seleccion_multiple', 'texto_corto', 'numero'];

const OPERADORES_SEC = [
  { value: 'igual',         label: 'es igual a' },
  { value: 'diferente',     label: 'es diferente a' },
  { value: 'contiene',      label: 'contiene' },
  { value: 'no_contiene',   label: 'no contiene' },
  { value: 'esta_vacio',    label: 'está vacío' },
  { value: 'no_esta_vacio', label: 'no está vacío' },
];

function ReglaRowSeccion({ regla, camposDisponibles, onChange, onDelete }) {
  const campoSel = camposDisponibles.find(c => String(c.id) === String(regla.campoId));
  const opcionesValor = campoSel ? toArray(campoSel.opciones) : [];
  const mostrarValor = !['esta_vacio', 'no_esta_vacio'].includes(regla.operador);
  return (
    <div className="flex flex-wrap items-start gap-1 p-2 rounded bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-navy-700">
      <select
        value={String(regla.campoId || '')}
        onChange={e => onChange({ ...regla, campoId: e.target.value, valor: '' })}
        className="flex-1 min-w-[110px] text-xs rounded border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-800 text-slate-800 dark:text-slate-100 px-2 py-1 focus:outline-none"
      >
        <option value="">Campo...</option>
        {camposDisponibles.map(c => <option key={c.id} value={String(c.id)}>{c.etiqueta}</option>)}
      </select>
      <select
        value={regla.operador}
        onChange={e => onChange({ ...regla, operador: e.target.value })}
        className="flex-1 min-w-[110px] text-xs rounded border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-800 text-slate-800 dark:text-slate-100 px-2 py-1 focus:outline-none"
      >
        {OPERADORES_SEC.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
      </select>
      {mostrarValor && (
        opcionesValor.length > 0 ? (
          <select
            value={regla.valor || ''}
            onChange={e => onChange({ ...regla, valor: e.target.value })}
            className="flex-1 min-w-[80px] text-xs rounded border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-800 text-slate-800 dark:text-slate-100 px-2 py-1 focus:outline-none"
          >
            <option value="">Valor...</option>
            {opcionesValor.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
        ) : (
          <input
            type="text"
            value={regla.valor || ''}
            onChange={e => onChange({ ...regla, valor: e.target.value })}
            placeholder="Valor..."
            className="flex-1 min-w-[80px] text-xs rounded border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-800 text-slate-800 dark:text-slate-100 px-2 py-1 focus:outline-none"
          />
        )
      )}
      <button type="button" onClick={onDelete} className="text-slate-400 hover:text-red-500 p-0.5">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Añadir botón de condiciones en el header de la sección**

En el header (antes del botón "Eliminar", aprox. línea 111), añadir:

```jsx
{/* Toggle condiciones */}
<button
  type="button"
  title="Visibilidad condicional"
  onClick={() => setPanelCondicionesVisible(v => !v)}
  className={`text-white/60 hover:text-white shrink-0 ${seccion.condiciones ? 'text-amber-300 hover:text-amber-200' : ''}`}
>
  <GitBranch className="w-3.5 h-3.5" />
</button>
```

- [ ] **Step 6: Añadir el panel de condiciones entre el header y el cuerpo de campos**

Añadir justo después del `</div>` del header (aprox. línea 122) y antes del bloque `{expandida && ...}`:

```jsx
{/* Panel condiciones */}
{panelCondicionesVisible && (() => {
  const condiciones = seccion.condiciones;
  const camposDisponibles = camposDelFormulario.filter(c =>
    c.id && TIPOS_TRIGGER_SEC.includes(c.tipo)
  );
  function setCondiciones(cond) {
    onActualizarCondiciones(seccion._key, cond);
  }
  return (
    <div className="p-3 flex flex-col gap-2 bg-slate-50 dark:bg-navy-850 border-b border-slate-200 dark:border-navy-600">
      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-semibold">
        <input
          type="checkbox"
          checked={!!condiciones}
          onChange={e => setCondiciones(
            e.target.checked ? { operadorLogico: 'Y', reglas: [] } : null
          )}
          className="h-3.5 w-3.5 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
        />
        Activar visibilidad condicional
      </label>

      {condiciones && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500">Mostrar si se cumplen</span>
            <select
              value={condiciones.operadorLogico}
              onChange={e => setCondiciones({ ...condiciones, operadorLogico: e.target.value })}
              className="text-xs rounded border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-800 text-slate-800 dark:text-slate-100 px-2 py-1 focus:outline-none"
            >
              <option value="Y">TODAS las reglas</option>
              <option value="O">ALGUNA regla</option>
            </select>
            <span className="text-xs text-slate-500">siguientes reglas:</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {condiciones.reglas.map((regla, idx) => (
              <ReglaRowSeccion
                key={idx}
                regla={regla}
                camposDisponibles={camposDisponibles}
                onChange={r => {
                  const reglas = [...condiciones.reglas];
                  reglas[idx] = r;
                  setCondiciones({ ...condiciones, reglas });
                }}
                onDelete={() => {
                  const reglas = condiciones.reglas.filter((_, i) => i !== idx);
                  setCondiciones({ ...condiciones, reglas });
                }}
              />
            ))}
          </div>
          {condiciones.reglas.length < 10 && camposDisponibles.length > 0 && (
            <button
              type="button"
              onClick={() => setCondiciones({
                ...condiciones,
                reglas: [...condiciones.reglas, { campoId: '', operador: 'igual', valor: '' }],
              })}
              className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 self-start"
            >
              <Plus className="w-3 h-3" />
              Agregar regla
            </button>
          )}
        </>
      )}
    </div>
  );
})()}
```

Nota: necesita importar `Plus` — añadirlo al import de lucide (línea 4 actualizada):

```js
import { ChevronDown, ChevronRight, Pencil, Trash2, Eye, EyeOff, Check, X, GitBranch, Plus } from 'lucide-react';
```

- [ ] **Step 7: Verificar en el navegador**

Abrir el builder, crear una sección, hacer clic en el ícono de condiciones en el header de la sección. Verificar que aparece el panel.

- [ ] **Step 8: Commit**

```bash
git add soporte-ti-istho/client/src/components/formularios/SeccionItem.jsx
git commit -m "feat: add conditional visibility rule builder to SeccionItem"
```

---

## Task 9: `FormularioRenderer` — componente `CampoGrilla`

**Files:**
- Modify: `soporte-ti-istho/client/src/components/formularios/FormularioRenderer.jsx`

- [ ] **Step 1: Añadir función `CampoGrilla` antes de `CampoInput`**

Añadir antes de `function CampoInput` (antes de la línea 131):

```jsx
function CampoGrilla({ campo, value, onChange, disabled }) {
  const opts = (campo.opciones && typeof campo.opciones === 'object' && !Array.isArray(campo.opciones))
    ? campo.opciones
    : {};
  const columnas = Array.isArray(opts.columnas) ? opts.columnas : [];
  const filas = Array.isArray(opts.filas) ? opts.filas : [];
  const conObs = Boolean(opts.conObservaciones);

  const entries = Array.isArray(value) ? value : [];

  function getEntry(filaIdx) {
    return entries.find(e => e.fila === filaIdx) || { fila: filaIdx, columna: null, observacion: '' };
  }

  function setEntry(filaIdx, patch) {
    const next = filas.map((_, idx) => {
      const e = getEntry(idx);
      return idx === filaIdx ? { ...e, ...patch } : e;
    });
    onChange(next);
  }

  const label = (
    <span className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
      {campo.etiqueta}
      {campo.requerido && <span className="text-orange-500">*</span>}
    </span>
  );

  return (
    <div>
      {label}
      {campo.descripcion && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{campo.descripcion}</p>
      )}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-navy-600">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 bg-slate-100 dark:bg-navy-700 border-b border-slate-200 dark:border-navy-600 font-medium text-slate-600 dark:text-slate-300 text-xs min-w-[140px]" />
              {columnas.map(col => (
                <th
                  key={col}
                  className="px-3 py-2 bg-slate-100 dark:bg-navy-700 border-b border-slate-200 dark:border-navy-600 font-medium text-slate-600 dark:text-slate-300 text-xs text-center whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
              {conObs && (
                <th className="px-3 py-2 bg-slate-100 dark:bg-navy-700 border-b border-slate-200 dark:border-navy-600 font-medium text-slate-600 dark:text-slate-300 text-xs text-left whitespace-nowrap min-w-[160px]">
                  Observaciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, filaIdx) => {
              const entry = getEntry(filaIdx);
              return (
                <tr
                  key={filaIdx}
                  className={filaIdx % 2 === 0
                    ? 'bg-white dark:bg-navy-800'
                    : 'bg-slate-50 dark:bg-navy-900'}
                >
                  <td className="px-3 py-2 border-b border-slate-100 dark:border-navy-700 text-slate-700 dark:text-slate-300 text-xs">
                    {fila}
                  </td>
                  {columnas.map(col => (
                    <td
                      key={col}
                      className="px-3 py-2 border-b border-slate-100 dark:border-navy-700 text-center"
                    >
                      <input
                        type="radio"
                        name={`grilla-${campo.id}-fila${filaIdx}`}
                        checked={entry.columna === col}
                        onChange={() => setEntry(filaIdx, { columna: col })}
                        disabled={disabled}
                        className="h-4 w-4 text-orange-500 focus:ring-orange-500 cursor-pointer"
                        title={col}
                      />
                    </td>
                  ))}
                  {conObs && (
                    <td className="px-3 py-2 border-b border-slate-100 dark:border-navy-700">
                      <input
                        type="text"
                        value={entry.observacion || ''}
                        onChange={e => setEntry(filaIdx, { observacion: e.target.value })}
                        disabled={disabled}
                        placeholder="Observación..."
                        className="w-full px-2 py-1 rounded border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500/50 disabled:opacity-60"
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Añadir el caso `grilla` en `CampoInput`**

Al final de `CampoInput`, antes del `return null` (línea 253), añadir:

```jsx
if (campo.tipo === 'grilla') {
  return (
    <CampoGrilla
      campo={campo}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}
```

- [ ] **Step 3: Verificar en el navegador**

En el builder, agregar un campo tipo "Grilla de calificación", configurar columnas y filas, guardar, luego abrir "Vista previa" (o ir a responder el formulario). Comprobar que la tabla se renderiza correctamente con radio buttons.

- [ ] **Step 4: Commit**

```bash
git add soporte-ti-istho/client/src/components/formularios/FormularioRenderer.jsx
git commit -m "feat: add CampoGrilla component to FormularioRenderer"
```

---

## Task 10: Integrar `useCondicionales` en `FormularioResponderPage` y `FormularioRenderer`

**Files:**
- Modify: `soporte-ti-istho/client/src/pages/FormularioResponderPage.jsx`
- Modify: `soporte-ti-istho/client/src/components/formularios/FormularioRenderer.jsx`

### Parte A — `FormularioRenderer`: aceptar props de filtrado

- [ ] **Step 1: Actualizar firma de `FormularioRenderer` para aceptar `camposVisibles` y `seccionesVisibles`**

Reemplazar la línea 43 (definición del componente):

```js
export function FormularioRenderer({ campos = [], secciones = [], valores = {}, onChange, disabled, camposVisibles, seccionesVisibles }) {
```

- [ ] **Step 2: Filtrar campos y secciones al inicio del componente**

Añadir estas dos líneas justo después de la definición de `handleChange` (después de la línea 46):

```js
const camposFiltrados = camposVisibles ? campos.filter(c => camposVisibles.has(c.id)) : campos;
const seccionesFiltradas = seccionesVisibles ? secciones.filter(s => seccionesVisibles.has(s.id)) : secciones;
```

- [ ] **Step 3: Reemplazar `campos` y `secciones` por las versiones filtradas en toda la función**

En el renderizado sin secciones (línea 49), reemplazar:

```js
if (seccionesFiltradas.length === 0) {
  return (
    <div className="flex flex-col gap-5">
      {camposFiltrados.map(campo => (
```

En el renderizado con secciones (línea 66), reemplazar:

```js
const seccionMap = new Map(seccionesFiltradas.map(s => [s.id, s]));
const groups = [];
const seccionesVisiblesParaUsuario = seccionesFiltradas.filter(s => s.visibleParaUsuario);
for (const sec of seccionesVisiblesParaUsuario) {
  const secCampos = camposFiltrados
```

Y continuar reemplazando las referencias a `secciones` y `campos` en el resto de la función con `seccionesFiltradas` y `camposFiltrados`. El código completo actualizado del componente `FormularioRenderer` queda:

```jsx
export function FormularioRenderer({ campos = [], secciones = [], valores = {}, onChange, disabled, camposVisibles, seccionesVisibles }) {
  function handleChange(campoId, value) {
    if (onChange) onChange({ ...valores, [campoId]: value });
  }

  const camposFiltrados   = camposVisibles    ? campos.filter(c => camposVisibles.has(c.id))    : campos;
  const seccionesFiltradas = seccionesVisibles ? secciones.filter(s => seccionesVisibles.has(s.id)) : secciones;

  if (seccionesFiltradas.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {camposFiltrados.map(campo => (
          <CampoInput
            key={campo.id}
            campo={campo}
            value={valores[campo.id] ?? ''}
            onChange={v => handleChange(campo.id, v)}
            disabled={disabled}
          />
        ))}
      </div>
    );
  }

  const seccionMap = new Map(seccionesFiltradas.map(s => [s.id, s]));
  const groups = [];

  const seccionesConHeader = seccionesFiltradas.filter(s => s.visibleParaUsuario);
  for (const sec of seccionesConHeader) {
    const secCampos = camposFiltrados
      .filter(c => c.seccionId === sec.id)
      .sort((a, b) => a.orden - b.orden);
    if (secCampos.length > 0) {
      groups.push({ tipo: 'visible', seccion: sec, campos: secCampos });
    }
  }

  const seccionesOcultas = seccionesFiltradas.filter(s => !s.visibleParaUsuario);
  const camposDeSecOculta = camposFiltrados.filter(c =>
    c.seccionId && seccionesOcultas.some(s => s.id === c.seccionId)
  ).sort((a, b) => a.orden - b.orden);
  if (camposDeSecOculta.length > 0) {
    groups.push({ tipo: 'oculto', campos: camposDeSecOculta });
  }

  const camposSinSeccion = camposFiltrados
    .filter(c => !c.seccionId || !seccionMap.has(c.seccionId))
    .sort((a, b) => a.orden - b.orden);
  if (camposSinSeccion.length > 0) {
    groups.push({ tipo: 'sin_seccion', campos: camposSinSeccion });
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group, i) => {
        if (group.tipo === 'visible') {
          return (
            <SeccionColapsable key={group.seccion.id} nombre={group.seccion.nombre}>
              {group.campos.map(campo => (
                <CampoInput
                  key={campo.id}
                  campo={campo}
                  value={valores[campo.id] ?? ''}
                  onChange={v => handleChange(campo.id, v)}
                  disabled={disabled}
                />
              ))}
            </SeccionColapsable>
          );
        }
        return group.campos.map(campo => (
          <CampoInput
            key={campo.id}
            campo={campo}
            value={valores[campo.id] ?? ''}
            onChange={v => handleChange(campo.id, v)}
            disabled={disabled}
          />
        ));
      })}
    </div>
  );
}
```

### Parte B — `FormularioResponderPage`: usar el hook

- [ ] **Step 4: Añadir import del hook en `FormularioResponderPage`**

Añadir a los imports (después de la línea `import { useAuth }...`):

```js
import { useCondicionales } from '../components/formularios/useCondicionales';
```

- [ ] **Step 5: Usar el hook en el componente**

Después de `const [successData, setSuccessData] = useState(null);` (línea 18), añadir:

```js
const { camposVisibles, seccionesVisibles } = useCondicionales(
  formulario?.campos || [],
  formulario?.secciones || [],
  valores
);
```

- [ ] **Step 6: Limpiar valores de campos ocultos con `useEffect`**

Añadir después del `useEffect` de carga del formulario (después de la línea 24):

```js
useEffect(() => {
  if (!formulario) return;
  setValores(prev => {
    const next = { ...prev };
    let changed = false;
    for (const campo of formulario.campos || []) {
      if (!camposVisibles.has(campo.id) && campo.id in next) {
        delete next[campo.id];
        changed = true;
      }
    }
    return changed ? next : prev;
  });
}, [camposVisibles, formulario]);
```

- [ ] **Step 7: Actualizar `validar()` para solo validar campos visibles**

Reemplazar la función `validar` (líneas 26-36):

```js
function validar() {
  if (!formulario) return false;
  for (const campo of formulario.campos || []) {
    if (!camposVisibles.has(campo.id)) continue;
    if (!campo.requerido) continue;
    const val = valores[campo.id];
    if (val === undefined || val === null || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (campo.tipo === 'grilla') {
      const opts = campo.opciones || {};
      const filas = Array.isArray(opts.filas) ? opts.filas : [];
      const sinColumna = filas.some((_, idx) => {
        const entry = Array.isArray(val) ? val.find(e => e.fila === idx) : null;
        return !entry || !entry.columna;
      });
      if (sinColumna) return false;
    }
  }
  return true;
}
```

- [ ] **Step 8: Filtrar valores al enviar para no incluir campos ocultos**

En `handleSubmit`, reemplazar la línea de `formulariosApi.responder`:

```js
const valoresFiltrados = {};
for (const campo of formulario.campos || []) {
  if (camposVisibles.has(campo.id) && campo.id in valores) {
    valoresFiltrados[campo.id] = valores[campo.id];
  }
}
const res = await formulariosApi.responder(id, { campos: valoresFiltrados });
```

- [ ] **Step 9: Pasar `camposVisibles` y `seccionesVisibles` al renderer**

Actualizar el render de `FormularioRenderer` (líneas 82-88):

```jsx
<FormularioRenderer
  campos={formulario.campos || []}
  secciones={formulario.secciones || []}
  valores={valores}
  onChange={setValores}
  disabled={submitting}
  camposVisibles={camposVisibles}
  seccionesVisibles={seccionesVisibles}
/>
```

- [ ] **Step 10: Verificar en el navegador — flujo completo**

1. Crear formulario con campo `seleccion_unica` (opciones: Lácteos, Comida)
2. Crear otro campo con condición: "visible si campo 1 es igual a Lácteos"
3. Guardar campos
4. Ir a responder el formulario
5. Verificar que el segundo campo aparece solo cuando se selecciona "Lácteos"
6. Verificar que al cambiar a "Comida" el segundo campo desaparece y su valor se limpia

- [ ] **Step 11: Commit**

```bash
git add soporte-ti-istho/client/src/components/formularios/FormularioRenderer.jsx
git add soporte-ti-istho/client/src/pages/FormularioResponderPage.jsx
git commit -m "feat: integrate useCondicionales hook into renderer and responder page"
```

---

## Task 11: `formularioRespuestaController` — almacenar grilla y filtrar campos ocultos

**Files:**
- Modify: `soporte-ti-istho/server/src/controllers/formularioRespuestaController.js`

- [ ] **Step 1: Incluir `FormularioSeccion` en el modelo importado**

Reemplazar la línea de imports de modelos (líneas 6-9):

```js
const {
  Formulario, FormularioCampo, FormularioSeccion, FormularioPdfPlantilla,
  FormularioPdfMapeo, FormularioRespuesta, RespuestaCampo,
  FormularioPdfGenerado, Usuario, Solicitud,
} = require('../models');
```

- [ ] **Step 2: Incluir `secciones` en la query del formulario dentro de `responder`**

Actualizar el `Formulario.findOne` (líneas 16-26) para incluir secciones:

```js
const formulario = await Formulario.findOne({
  where: { id: req.params.id, activo: true },
  include: [
    { model: FormularioCampo, as: 'campos' },
    { model: FormularioSeccion, as: 'secciones' },
    {
      model: FormularioPdfPlantilla, as: 'plantillas',
      order: [['created_at', 'DESC']],
      limit: 1,
    },
  ],
});
```

- [ ] **Step 3: Añadir la función `evaluarCondicion` al inicio del archivo**

Añadir después de los `require` (antes de la función `responder`):

```js
function evaluarCondicion(condicion, valores) {
  if (!condicion || !condicion.reglas || condicion.reglas.length === 0) return true;
  const resultados = condicion.reglas.map(regla => {
    const val = valores[regla.campoId] ?? valores[String(regla.campoId)];
    const str = Array.isArray(val) ? val.join(', ') : String(val ?? '');
    switch (regla.operador) {
      case 'igual':         return str === String(regla.valor ?? '');
      case 'diferente':     return str !== String(regla.valor ?? '');
      case 'contiene':      return Array.isArray(val) ? val.includes(regla.valor) : str.includes(String(regla.valor ?? ''));
      case 'no_contiene':   return Array.isArray(val) ? !val.includes(regla.valor) : !str.includes(String(regla.valor ?? ''));
      case 'esta_vacio':    return !val || (Array.isArray(val) && val.length === 0) || str === '';
      case 'no_esta_vacio': return !!val && !(Array.isArray(val) && val.length === 0) && str !== '';
      default: return true;
    }
  });
  return condicion.operadorLogico === 'O' ? resultados.some(Boolean) : resultados.every(Boolean);
}
```

- [ ] **Step 4: Calcular campos visibles y validar requeridos antes de procesar**

Reemplazar el bloque de procesamiento de valores (líneas 47-70) por:

```js
const { campos: valoresCampos = {} } = req.body;

// Determinar secciones visibles
const seccionesVisibles = new Set(
  (formulario.secciones || [])
    .filter(s => !s.condiciones || evaluarCondicion(s.condiciones, valoresCampos))
    .map(s => s.id)
);

// Determinar campos visibles (el campo debe estar en una sección visible o no tener sección)
const camposVisibles = new Set(
  formulario.campos.filter(campo => {
    if (campo.seccionId && !seccionesVisibles.has(campo.seccionId)) return false;
    return !campo.condiciones || evaluarCondicion(campo.condiciones, valoresCampos);
  }).map(c => c.id)
);

// Validar campos requeridos visibles
for (const campo of formulario.campos) {
  if (!camposVisibles.has(campo.id) || !campo.requerido) continue;
  const valor = valoresCampos[campo.id];
  const estaVacio = valor === undefined || valor === null || valor === ''
    || (Array.isArray(valor) && valor.length === 0);
  if (estaVacio) {
    return res.status(400).json({
      success: false,
      message: `El campo "${campo.etiqueta}" es requerido`,
    });
  }
}

const respuestaCamposData = [];

for (const campo of formulario.campos) {
  if (!camposVisibles.has(campo.id)) continue;
  const valor = valoresCampos[campo.id];
  if (valor !== undefined && valor !== null && valor !== '') {
    if (campo.tipo === 'firma' && typeof valor === 'string' && valor.startsWith('data:image/')) {
      const uploadResult = await _uploadBase64(valor, `sist-firmas/${respuesta.id}`, req);
      respuestaCamposData.push({
        respuestaId: respuesta.id,
        campoId: campo.id,
        archivoUrl: uploadResult.secure_url,
        archivoPublicId: uploadResult.public_id,
      });
    } else if (campo.tipo === 'grilla') {
      respuestaCamposData.push({
        respuestaId: respuesta.id,
        campoId: campo.id,
        valor: JSON.stringify(valor),
      });
    } else {
      respuestaCamposData.push({
        respuestaId: respuesta.id,
        campoId: campo.id,
        valor: Array.isArray(valor) ? valor.join(', ') : String(valor),
      });
    }
  }
}
```

- [ ] **Step 5: Pasar `formulario.campos` al `llenarPDF`**

Actualizar la llamada a `llenarPDF` (línea ~79):

```js
const pdfBuffer = await llenarPDF(plantilla, plantillaMapeos, respuestaCampos, formulario.campos);
```

- [ ] **Step 6: Verificar que el endpoint procesa correctamente**

Iniciar servidor y enviar un formulario desde el browser. Verificar en logs del servidor que no hay errores y que los valores de campos ocultos no aparecen guardados en la BD.

- [ ] **Step 7: Commit**

```bash
git add soporte-ti-istho/server/src/controllers/formularioRespuestaController.js
git commit -m "feat: server-side conditions filtering, grilla JSON storage, required validation"
```

---

## Task 12: `pdfService` — renderizar grilla en PDF

**Files:**
- Modify: `soporte-ti-istho/server/src/services/pdfService.js`

- [ ] **Step 1: Actualizar la firma de `llenarPDF` para recibir `campos`**

Reemplazar la línea 37:

```js
async function llenarPDF(plantilla, mapeos, respuestaCampos, campos = []) {
```

- [ ] **Step 2: Añadir mapa de opciones de campos después del `campoMap`**

Después de `const campoMap = {};` / el loop de `respuestaCampos` (líneas 41-43), añadir:

```js
const campoOpcionesMap = {};
for (const campo of campos) {
  campoOpcionesMap[campo.id] = campo.opciones;
}
```

- [ ] **Step 3: Añadir renderizado de grilla en el loop de mapeos (bloque else — PDF sin AcroForm)**

Dentro del bloque `else` (renderizado posicional, aprox. línea 62+), en el loop de mapeos, reemplazar el bloque que chequea `rc.archivoUrl` / `rc.valor` (líneas 117-152) por:

```js
// Detectar si el valor es una grilla (JSON array de {fila, columna, observacion})
let grillaData = null;
if (rc.valor) {
  try {
    const parsed = JSON.parse(rc.valor);
    if (Array.isArray(parsed) && parsed.length > 0 && 'columna' in parsed[0]) {
      grillaData = parsed;
    }
  } catch { /* no es JSON */ }
}

if (rc.archivoUrl) {
  try {
    const imgResp = await axios.get(rc.archivoUrl, { responseType: 'arraybuffer' });
    const pngImage = await pdfDoc.embedPng(imgResp.data);
    const drawWidth = (chipAncho / 100) * width;
    const drawHeight = (chipAlto / 100) * height;
    page.drawImage(pngImage, {
      x: xLeft,
      y: yCentro - drawHeight / 2,
      width: drawWidth,
      height: drawHeight,
    });
  } catch (imgErr) {
    console.warn(`[pdfService] imagen fallo campoId=${mapeo.campoId}:`, imgErr.message);
  }
} else if (grillaData) {
  // Renderizar grilla: una fila de texto por entrada
  const opts = campoOpcionesMap[mapeo.campoId] || {};
  const filasLabels = Array.isArray(opts.filas) ? opts.filas : [];
  const conObs = Boolean(opts.conObservaciones);
  const fontSize = Number(mapeo.fontTamano) || 8;
  const font = await getFont('Helvetica', false, false);
  const color = hexToRgb(mapeo.fontColor || '#000000');
  const areaH = (chipAlto / 100) * height;
  const lineHeight = fontSize + 2;
  const maxLineas = Math.floor(areaH / lineHeight);
  const yInicio = yCentro + areaH / 2 - fontSize;

  for (let i = 0; i < Math.min(grillaData.length, maxLineas); i++) {
    const entry = grillaData[i];
    const filaLabel = filasLabels[entry.fila] || `Fila ${entry.fila + 1}`;
    const colText = entry.columna || '—';
    const obsText = conObs && entry.observacion ? ` (${entry.observacion})` : '';
    const texto = `${filaLabel}: ${colText}${obsText}`;
    const y = yInicio - i * lineHeight;
    try {
      page.drawText(texto, { x: xLeft, y, size: fontSize, font, color });
    } catch { /* skip */ }
  }
} else if (rc.valor) {
  const fontSize = Number(mapeo.fontTamano) || 10;
  const familia = mapeo.fontFamilia || 'Helvetica';
  const negrita = Boolean(mapeo.fontNegrita);
  const cursiva = Boolean(mapeo.fontCursiva);
  const color = hexToRgb(mapeo.fontColor);
  const font = await getFont(familia, negrita, cursiva);
  const textoConFecha = aplicarFormatoFecha(rc.valor, mapeo.formatoFecha);
  const textoFinal = aplicarTransformTexto(textoConFecha, mapeo.transformTexto);
  try {
    page.drawText(String(textoFinal), {
      x: xLeft,
      y: yCentro,
      size: fontSize,
      font,
      color,
    });
  } catch (textErr) {
    console.warn(`[pdfService] drawText fallo campoId=${mapeo.campoId} valor="${rc.valor}":`, textErr.message);
  }
}
```

- [ ] **Step 4: Verificar que el servidor levanta y procesa un PDF con grilla**

Reiniciar el servidor y enviar un formulario que tenga un campo grilla mapeado a un PDF. Comprobar que el PDF generado incluye las filas de la grilla.

- [ ] **Step 5: Commit**

```bash
git add soporte-ti-istho/server/src/services/pdfService.js
git commit -m "feat: render grilla as text rows in PDF llenarPDF"
```

---

## Verificación final

- [ ] **Migración aplicada sin errores** — `npm run db:migrate` completó las 3 nuevas migraciones
- [ ] **Grilla en builder** — Se puede crear un campo grilla con columnas/filas personalizadas y toggle de observaciones
- [ ] **Condicionales en campo** — Se puede configurar reglas Y/O en CampoEditorModal; las reglas se guardan y se recargan al editar
- [ ] **Condicionales en sección** — El botón de condiciones en SeccionItem abre el panel; las reglas se guardan
- [ ] **Renderer oculta campos** — Al responder, campos con condiciones no satisfechas no se muestran y sus valores se limpian
- [ ] **Grilla en renderer** — La tabla se muestra con radio buttons y observaciones opcionales
- [ ] **Grilla validación** — Al intentar enviar con campo grilla requerido sin completar todas las filas, aparece error
- [ ] **Servidor descarta ocultos** — Los valores de campos ocultos no se guardan en `respuesta_campos`
- [ ] **PDF con grilla** — Un mapeo que apunta a un campo grilla muestra las filas en el PDF generado
