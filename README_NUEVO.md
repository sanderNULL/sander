# Sistema de Gestión de Facturas - Nueva Versión

Este proyecto ha sido modernizado con una arquitectura separada:
- **Backend**: FastAPI (Python) para procesamiento de facturas.
- **Frontend**: React + Vite para una interfaz de usuario profesional y responsiva.

## Estructura de Carpetas
- `/backend`: Código del servidor, scripts de extracción y almacenamiento de archivos.
- `/frontend`: Código fuente de la interfaz de usuario.
- `venv`: Entorno virtual de Python.

## Cómo Iniciar el Sistema

### Paso 1: Backend (Servidor de Datos)
1. Abre una terminal.
2. Navega a la carpeta `backend`:
   ```bash
   cd backend
   ```
3. Activa el entorno virtual (si no está activo):
   ```bash
   ..\venv\Scripts\activate
   ```
4. Inicia el servidor:
   ```bash
   uvicorn server:app --reload
   ```
   *El servidor correrá en http://localhost:8000*

### Paso 2: Frontend (Interfaz de Usuario)
1. Abre **otra** terminal.
2. Navega a la carpeta `frontend`:
   ```bash
   cd frontend
   ```
3. Instala las dependencias (solo la primera vez):
   ```bash
   npm install
   ```
4. Inicia la aplicación:
   ```bash
   npm run dev
   ```
5. Abre tu navegador en la URL que aparece (usualmente `http://localhost:5173`).

## Características
- Dashboard principal con métricas.
- Navegación lateral con menú desplegable animado.
- Módulo de **Validación Automática** con carga de múltiples archivos y tabla de resultados.
