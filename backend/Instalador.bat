@echo off
echo ==========================================
echo    INSTALADOR DE DEPENDENCIAS
echo ==========================================
echo.

echo 1. Creando entorno virtual...
python -m venv venv

echo 2. Activando entorno...
REM -- AQUI ESTA EL TRUCO: Usamos "call" para que regrese a este script despues
call venv\Scripts\activate

echo 3. Instalando librerias desde requirements.txt...
pip install -r requirements.txt

echo.
echo ==========================================
echo    INSTALACION COMPLETADA
echo ==========================================
echo.
pause