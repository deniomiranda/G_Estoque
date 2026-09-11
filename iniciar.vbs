' Inicia o servidor "Gestao de Estoque" totalmente em segundo plano,
' sem nenhuma janela visivel (nem minimizada), e depois abre o navegador.

Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set WshShell = CreateObject("WScript.Shell")

' Inicia o Node.js oculto (janela de estilo 0 = totalmente escondida).
' A saida do servidor fica registrada em "servidor.log" para consulta, se necessario.
comando = "cmd /c cd /d """ & scriptDir & """ && node server.js > servidor.log 2>&1"
WshShell.Run comando, 0, False

' Aguarda alguns segundos para o servidor subir antes de abrir o navegador
WScript.Sleep 2500

' Abre o sistema no navegador padrao do Windows
WshShell.Run "http://localhost:3000", 1, False
