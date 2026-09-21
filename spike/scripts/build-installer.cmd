@echo off
setlocal
cd /d "%~dp0.."
echo [1/4] Publication autonome win-x64 (Windows App SDK embarque)
dotnet publish src\DockTerminal.Spike.Host\DockTerminal.Spike.Host.csproj -c Release -r win-x64 -p:Platform=x64 --self-contained -o publish || exit /b 1
echo [2/4] Copie de la conpty.dll OpenConsole si presente
if exist vendor\conpty\conpty.dll (
  copy /y vendor\conpty\conpty.dll publish\ >nul
  copy /y vendor\conpty\OpenConsole.exe publish\ >nul
)
echo [3/4] Bootstrapper WebView2 Evergreen
if not exist installer\MicrosoftEdgeWebview2Setup.exe (
  curl -L -o installer\MicrosoftEdgeWebview2Setup.exe "https://go.microsoft.com/fwlink/p/?LinkId=2124703" || exit /b 1
)
echo [4/4] Compilation de l'installeur Inno Setup
set ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe
if not exist "%ISCC%" set ISCC=%LocalAppData%\Programs\Inno Setup 6\ISCC.exe
"%ISCC%" installer\DockTerminalSpike.iss || exit /b 1
echo Installeur produit dans installer\output
