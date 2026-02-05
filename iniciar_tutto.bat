@echo off
title Lanzador del Sistema de Gestion de Facturas

echo ==========================================================
echo    INICIANDO SISTEMA DE GESTION DE FACTURAS (SAT)
echo ==========================================================
echo.

:: 1. Iniciar Backend (API Python) en una nueva ventana
echo [1/3] Iniciando Servidor Backend...
start "Backend API (Python)" cmd /k "cd backend && call ..\venv\Scripts\activate && uvicorn server:app --reload --host 127.0.0.1 --port 8000"

:: 2. Iniciar Frontend (React) en una nueva ventana
echo [2/3] Iniciando Interfaz de Usuario...
cd frontend
start "Frontend (React)" cmd /k "npm run dev -- --open"

:: 3. Mensaje final
cd ..
echo.
echo [3/3] Comandos enviados.
echo.
echo ==========================================================
echo    EL SISTEMA SE ESTA ABRIENDO EN TU NAVEGADOR
echo ==========================================================
echo.
echo NOTA: No cierres las ventanas negras que aparecieron, 
echo son el motor del sistema. Puedes minimizarlas.
echo.
pause
