@echo off
title Parar Gestao de Estoque
cd /d "%~dp0"

if not exist servidor.pid (
    echo Nenhum servidor em execucao foi encontrado.
    echo (arquivo servidor.pid nao existe - o sistema ja deve estar parado)
    pause
    exit /b
)

set /p PID=<servidor.pid
echo Encerrando o servidor de Gestao de Estoque (processo %PID%)...
taskkill /PID %PID% /T /F >nul 2>&1

if %errorlevel%==0 (
    echo Servidor encerrado com sucesso.
) else (
    echo Nao foi possivel encerrar automaticamente.
    echo Abra o Gerenciador de Tarefas, procure por "node.exe" e finalize manualmente.
)

del /f /q servidor.pid >nul 2>&1
pause
