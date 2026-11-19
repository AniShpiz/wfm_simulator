@echo off
rem  Opens the WFM Simulator in Chrome; no Chrome -> Edge; neither -> the computer's default browser.
rem  Always the SAME browser = the same saved settings (each browser keeps its own).
rem  Keep this file next to index.html (the network folder is fine). To open it from another familiar place, put a
rem  Windows shortcut to THIS file there (right-click -> Send to -> Desktop) - or write the app's full path below.
setlocal
set "APP=%~dp0index.html"
rem set "APP=\\server\share\WFM\index.html"

for %%B in (
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) do if exist %%B (
  start "" %%B "%APP%"
  exit /b
)
start "" "%APP%"
