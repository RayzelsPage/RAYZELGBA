@echo off
setlocal ENABLEDELAYEDEXPANSION
echo Downloading gba.min.js to %cd%...
set URL1=https://cdn.jsdelivr.net/npm/gbajs@latest/dist/gba.min.js
set URL2=https://unpkg.com/gbajs@latest/dist/gba.min.js
set URL3=https://cdn.jsdelivr.net/gh/endrift/gbajs/gba.min.js

where curl >nul 2>nul
if %errorlevel%==0 (
  for %%U in (%URL1% %URL2% %URL3%) do (
    echo Trying %%U
    curl -fsSL "%%U" -o "gba.min.js" && goto :ok
  )
) else (
  where powershell >nul 2>nul
  if %errorlevel%==0 (
    for %%U in (%URL1% %URL2% %URL3%) do (
      echo Trying %%U
      powershell -Command "(New-Object Net.WebClient).DownloadFile('%%U', 'gba.min.js')" && goto :ok
    )
  )
)

echo Failed to download gba.min.js. Try again on another network.
exit /b 1

:ok
echo ✅ Downloaded gba.min.js
exit /b 0
