@echo off
TITLE Mini Snippets AI Compiler - Runner
SETLOCAL

:: Check if Node.js is in PATH
where node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in your system PATH.
    echo Please install Node.js from https://nodejs.org/
    echo If already installed, try restarting your terminal or computer.
    pause
    exit /b 1
)

:: Check if npm is in PATH
where npm >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not found in your system PATH.
    echo This usually means Node.js was not installed correctly.
    pause
    exit /b 1
)

:: Check if node_modules exists
IF NOT EXIST "node_modules\" (
    echo [SYSTEM] node_modules not found. Installing dependencies...
    call npm install
    IF %ERRORLEVEL% NEQ 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b %ERRORLEVEL%
    )
)

echo [SYSTEM] Starting development server...
call npm run dev -- --open

ENDLOCAL
pause
