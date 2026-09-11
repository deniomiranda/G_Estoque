@echo off
REM Este atalho inicia o servidor totalmente oculto (sem nenhuma janela)
REM e depois abre o sistema automaticamente no navegador.
cd /d "%~dp0"
start "" wscript.exe "%~dp0iniciar.vbs"
exit
