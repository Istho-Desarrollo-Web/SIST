# Formularios: Grilla de Calificación y Campos Condicionales

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Agregar dos nuevos tipos de funcionalidad al sistema de formularios: un tipo de campo "Grilla de calificación" (tabla con filas/columnas configurables y columna de observaciones opcional) y lógica de visibilidad condicional para campos y secciones basada en reglas combinables.

**Architecture:** Ambas features extienden el modelo existente sin nuevas tablas principales — la grilla usa el JSON `opciones` ya presente en `formulario_campos`, y las condiciones agregan una columna `condiciones JSON` a `formulario_campos` y `formulario_secciones`. La evaluación de condiciones ocurre en el cliente (renderer) en tiempo real; el servidor limpia campos ocultos al procesar respuestas.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, Node.js, Express 5, Sequelize 6, MySQL 8, pdf-lib

---

## Modelo de datos

### Grilla de calificación

Nuevo valor `grilla` en el ENUM `tipo` de `formulario_campos`. La configuración se almacena en el campo JSON `opciones` ya existente:

```json
{
  "columnas": ["B", "R", "M", "N/A"],
  "filas": [
    "¿Fugas de aceite?",
    "¿Batería en buen estado?",
    "Compresor de aire"
  ],
  "conObservaciones": true
}
```

Límites: máximo 8 columnas, máximo 50 filas.

La respuesta del usuario se guarda en `formulario_respuesta_campos.valor` como JSON:

```json
[
  { "fila": 0, "columna": "B", "observacion": "" },
  { "fila": 1, "columna": "M", "observacion": "Requiere cambio urgente" },
  { "fila": 2, "columna": "N/A", "observacion": "" }
]
```

Un campo grilla con `requerido: true` exige que todas las filas tengan una columna seleccionada antes de enviar.

### Campos condicionales

Nueva columna `condiciones JSON NULL` en `formulario_campos` y en `formulario_secciones`. Estructura:

```json
{
  "operadorLogico": "Y",
  "reglas": [
    { "campoId": 5, "operador": "igual", "valor": "Lácteos" },
    { "campoId": 3, "operador": "diferente", "valor": "Norte" }
  ]
}
```

`operadorLogico`: `"Y"` (AND) o `"O"` (OR).

Operadores soportados:
- `igual` — valor del campo === valor de la regla
- `diferente` — valor del campo !== valor de la regla
- `contiene` — valor del campo incluye el string (para texto y selección múltiple)
- `no_contiene` — valor del campo no incluye el string
- `esta_vacio` — campo sin valor (no requiere `valor` en la regla)
- `no_esta_vacio` — campo con valor (no requiere `valor` en la regla)

`NULL` en `condiciones` significa "siempre visible" — comportamiento por defecto sin migrar datos existentes.

### Migraciones (3 archivos)

1. `add-grilla-to-tipo-enum` — agrega `grilla` al ENUM `tipo` de `formulario_campos`
2. `add-condiciones-to-formulario-campos` — agrega columna `condiciones JSON NULL`
3. `add-condiciones-to-formulario-secciones` — agrega columna `condiciones JSON NULL`

---

## Builder UI (admin)

### Editor de campo grilla — `CampoEditorModal.jsx`

Al seleccionar tipo `grilla`, aparecen dos paneles adicionales bajo los campos de label/descripción:

**Panel Columnas:**
- Lista de inputs de texto, uno por columna
- Botón `+ Agregar columna` (máx. 8)
- Botón eliminar por columna (mínimo 1 columna)

**Panel Filas:**
- Lista de inputs de texto, uno por fila
- Botón `+ Agregar fila` (máx. 50)
- Botón eliminar por fila (mínimo 1 fila)

**Toggle "Columna de observaciones":** activa/desactiva la columna de texto libre al final de cada fila.

### Visibilidad condicional — `CampoEditorModal.jsx` y `SeccionItem.jsx`

Sección colapsable **"Visibilidad condicional"** al final de ambos editores:

- Por defecto: colapsada, campo/sección siempre visible
- Al activar: muestra el panel de reglas
- **Selector de operador lógico:** `Cumplir TODAS las reglas (Y)` / `Cumplir ALGUNA regla (O)`
- **Lista de reglas**, cada regla con:
  - `Select` campo disparador — lista de campos del formulario con tipos `seleccion_unica`, `seleccion_multiple`, `texto_corto`, `numero` (excluye el campo actual y campos que ya tienen condiciones)
  - `Select` operador
  - `Input` valor (oculto para operadores `esta_vacio` / `no_esta_vacio`)
- Botón `+ Agregar regla` · Botón eliminar por regla

**Restricciones:**
- Un campo no puede referenciarse a sí mismo como disparador
- Un campo con condiciones no aparece como disparador disponible para otros campos (evita dependencias circulares)

---

## Renderer (usuario llenando el formulario)

### Grilla de calificación

Tabla HTML con:
- **Cabecera:** celda vacía para labels de fila + una `<th>` por columna configurada + `<th>Observaciones</th>` si activa
- **Filas:** texto de la fila + un radio button por columna (una sola selección por fila) + `<input type="text">` si observaciones activas
- Validación: si `requerido: true`, todas las filas deben tener selección — borde rojo al intentar enviar sin completar
- Responsive: en móvil los labels de columna se muestran como atributo `title` en los radio buttons

### Hook `useCondicionales`

```js
// client/src/components/formularios/useCondicionales.js
useCondicionales(campos, secciones, valores)
// → { camposVisibles: Set<id>, seccionesVisibles: Set<id> }
```

- Evalúa todas las condiciones cada vez que `valores` cambia
- Campos/secciones sin condiciones (`condiciones === null`) siempre visibles
- Campos ocultos **no se renderizan en el DOM** y sus valores se eliminan del estado al ocultarse

### Limpieza de valores al ocultar

Cuando un campo o sección pasa de visible a oculto, su valor (o los valores de todos sus campos) se eliminan del objeto de respuesta antes de enviar. El servidor no recibe ni valida campos que el usuario nunca vio.

---

## Servidor — procesamiento de respuestas

### Validación de campos requeridos

Al procesar una respuesta (`formularioRespuestaController`), el servidor recalcula qué campos son visibles dado el conjunto de valores recibidos, y solo valida `requerido` en los campos visibles.

### Limpieza al eliminar un campo disparador

Cuando el admin elimina un campo, el controller recorre todos los campos y secciones del formulario y elimina las reglas en `condiciones` que referencian ese `campoId`. Si una condición queda sin reglas, se pone a `NULL`.

---

## PDF — renderizado de grilla

En `pdfService.js`, una grilla asignada a un área del PDF se renderiza con `pdf-lib`:

- Líneas horizontales y verticales con `page.drawLine`
- Texto de fila a la izquierda de cada fila
- Columnas centradas con el valor seleccionado (texto de la columna o `X`)
- Columna de observaciones como texto al final si está activa
- El área está definida por los campos `posX / posY / ancho / alto` del mapeo existente

---

## Notas de implementación

- Los campos de tipo `grilla` son compatibles con el sistema de secciones y drag-and-drop existente — se tratan como cualquier otro campo en el builder
- `conObservaciones: false` por defecto al crear una grilla nueva
- La migración del ENUM de MySQL requiere redefinir el ENUM completo (limitación de MySQL/Sequelize)
- Feature futura anotada: análisis automático de PDF con IA para generar formulario — fuera de scope de este spec
