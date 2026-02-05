@echo off
echo Iniciando el Gestor de Facturas SAT...
echo Por favor no cierres esta ventana.
echo.
REM Activa el entorno virtual y arranca el servidor
call venv\Scripts\activate
start http://127.0.0.1:8000
uvicorn server:app --host 0.0.0.0 --port 8000
pause