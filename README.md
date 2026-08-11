# WIP Reparación — Panel de control

Dashboard interactivo (HTML + CSS + JS puro, sin frameworks ni build step) para visualizar el WIP de reparación: envejecimiento por unidad, cuellos de botella por estación/defecto, carga por zona y por orden de trabajo, y una tabla de unidades críticas.

Está pensado para publicarse tal cual en **GitHub Pages**: no requiere servidor backend, base de datos ni proceso de compilación.

## Estructura del proyecto

```
Dashboard/
│
├── index.html          # Página principal (punto de entrada)
├── style.css            # Todos los estilos
├── script.js             # Toda la lógica (filtros, gráficas, tabla)
│
├── data/
│   └── datos.json        # Los 1,656 registros del WIP (fuente de datos)
│
├── assets/
│   ├── vendor/
│   │   └── chart.umd.min.js   # Chart.js incluido localmente (ver nota abajo)
│   ├── iconos/                # (vacío — reservado, no se usan íconos como imagen)
│   └── imagenes/               # (vacío — reservado por si agregas capturas o gráficos estáticos)
│
└── README.md
```

> **Nota sobre imágenes:** el diseño original no depende de ningún logo ni fondo tipo imagen — el fondo, los íconos de estado y las gráficas se generan con CSS y Chart.js. Las carpetas `iconos/` e `imagenes/` quedan vacías (con un `.gitkeep` para que Git las suba) por si más adelante agregas tu propio logo o capturas.

### Por qué Chart.js está incluido localmente y no por CDN

La primera versión de este proyecto cargaba Chart.js desde `cdnjs.cloudflare.com` apuntando a la versión `4.4.4`. Esa versión específica **nunca se publicó en cdnjs** (cdnjs se quedó en 4.4.1 — ver [chartjs/Chart.js#11892](https://github.com/chartjs/Chart.js/issues/11892)), así que ese `<script>` devolvía 404 en producción y el navegador nunca definía la variable global `Chart`, de ahí el error `Uncaught ReferenceError: Chart is not defined`.

Para eliminar por completo ese riesgo (URLs rotas, versiones descontinuadas del CDN, bloqueos de red hacia dominios externos en la red del visitante), la librería ahora vive dentro del proyecto en `assets/vendor/chart.umd.min.js` y se carga con una ruta relativa. Es la misma librería Chart.js (MIT license), simplemente auto-hospedada — no depende de tu computadora ni de ningún servicio externo, y funciona igual en GitHub Pages.

## Cómo funciona

- `index.html` carga `style.css` y `script.js` con **rutas relativas** (`href="style.css"`, `src="script.js"`) y usa **Chart.js vía CDN** (`cdnjs.cloudflare.com`), por lo que no hay ningún archivo de librería descargado en el proyecto.
- `script.js` hace `fetch('data/datos.json')` al cargar la página para leer los datos — también con ruta relativa. Esto significa que el dashboard **debe abrirse a través de un servidor** (GitHub Pages, o un servidor local), no con doble clic sobre `index.html`, porque los navegadores bloquean `fetch()` sobre `file://` por seguridad.

## 1. Crear un repositorio nuevo en GitHub

1. Entra a [github.com](https://github.com) y haz clic en **New repository**.
2. Ponle un nombre, por ejemplo `wip-reparacion-dashboard`.
3. Puede ser público o privado (GitHub Pages funciona con ambos si tienes cuenta Pro/Team para privados; con cuenta gratuita usa uno **público**).
4. No marques "Add a README" si vas a subir el que ya tienes en esta carpeta.
5. Haz clic en **Create repository**.

## 2. Subir los archivos

**Opción A — Interfaz web de GitHub (sin usar terminal):**

1. En la página del repositorio recién creado, haz clic en **uploading an existing file**.
2. Arrastra **toda la carpeta `Dashboard/`** (o su contenido: `index.html`, `style.css`, `script.js`, la carpeta `data/`, la carpeta `assets/`, `README.md`).
3. Escribe un mensaje de commit, por ejemplo "Primera versión del dashboard".
4. Haz clic en **Commit changes**.

**Opción B — Git desde terminal:**

```bash
cd Dashboard
git init
git add .
git commit -m "Primera versión del dashboard"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/wip-reparacion-dashboard.git
git push -u origin main
```

## 3. Activar GitHub Pages

1. En el repositorio, ve a **Settings** → **Pages** (menú lateral izquierdo).
2. En **Source**, selecciona **Deploy from a branch**.
3. En **Branch**, elige `main` y la carpeta `/ (root)`.
4. Haz clic en **Save**.
5. Espera 1–2 minutos. GitHub mostrará la URL pública, con este formato:

```
https://TU_USUARIO.github.io/wip-reparacion-dashboard/
```

## 4. Abrir el dashboard

Abre esa URL en cualquier navegador (computadora, tablet o celular). No necesitas instalar nada ni tener el proyecto en tu computadora — funciona para cualquier persona con el enlace.

## 5. Actualizar los datos más adelante

Cuando tengas un nuevo corte de WIP (por ejemplo, la exportación de otro día):

1. Genera el nuevo `datos.json` con la misma estructura que el actual (ver abajo).
2. Reemplaza el archivo `data/datos.json` en el repositorio (puedes arrastrar el archivo nuevo desde la interfaz web de GitHub y confirmar el reemplazo, o hacer `git add data/datos.json && git commit -m "Actualiza datos" && git push`).
3. GitHub Pages se actualiza automáticamente en 1–2 minutos, sin tocar `index.html`, `style.css` ni `script.js`.

### Estructura esperada de `data/datos.json`

Es un arreglo plano de objetos, uno por unidad:

```json
[
  {
    "wo": "PLG000706",
    "sn": "GFBFLG263205495",
    "lastUpd": 2,
    "totalAging": 3,
    "unitState": "218- CRITICAL-REPAIR-IN Pass GoTo CRITICAL-REPAIR",
    "loc": "GFC_2",
    "zone": "GFC",
    "defect": "Insufficient solder",
    "tipo": "RWK VP & ASIC",
    "bucket": "0-3"
  }
]
```

| Campo | Significado |
|---|---|
| `wo` | Número de Work Order |
| `sn` | Número de serie de la unidad |
| `lastUpd` | Días desde la última actualización de estado |
| `totalAging` | Días desde el primer escaneo (antigüedad total en WIP) |
| `unitState` | Estación/paso de proceso actual |
| `loc` | Ubicación física exacta |
| `zone` | Zona (prefijo de `loc`, ej. GFC, VPWR, OSFP) |
| `defect` | Tipo de defecto reportado |
| `tipo` | Tipo de reparación asignado |
| `bucket` | Rango de antigüedad precalculado: `0-3`, `4-7`, `8-14`, `15-30`, `31-60`, `60+` |

Si prefieres partir de un Excel/CSV nuevo en lugar de armar el JSON a mano, cualquier script de Python con `pandas` puede generarlo (`df.to_json('datos.json', orient='records')`) siempre que respete estos nombres de columna.

## Solución de problemas

- **La página carga pero no aparece nada / consola muestra error de `fetch`:** asegúrate de estar accediendo por la URL de GitHub Pages (`https://...github.io/...`) y no abriendo `index.html` directo desde tu disco duro. Si quieres probarlo localmente antes de subirlo, corre un servidor simple en la carpeta del proyecto, por ejemplo `python -m http.server 8000`, y abre `http://localhost:8000`.
- **Las gráficas no aparecen:** revisa la consola del navegador (F12). Si el error menciona `Chart is not defined`, tu red o navegador está bloqueando el CDN `cdnjs.cloudflare.com`; verifica firewall/extensiones de bloqueo de anuncios.
- **Cambié `datos.json` y no veo el cambio:** los navegadores a veces cachean el JSON. Haz un refresco forzado (Ctrl+Shift+R / Cmd+Shift+R).
