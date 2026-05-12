@echo off
chcp 65001 >nul
title 极光导播 Aurora Director - 构建工具
echo ==========================================
echo   极光导播 Aurora Director - 构建工具
echo   github@Hyun-05
echo ==========================================
echo.

:: 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js！
    echo.
    echo 请先安装 Node.js：
    echo   https://nodejs.org/dist/v20.12.2/node-v20.12.2-x64.msi
    echo.
    pause
    exit /b 1
)

echo [1/5] 检测到 Node.js
echo.

:: 检查 npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo [错误] npm 命令不可用！
    pause
    exit /b 1
)

echo [2/5] 安装依赖中... (可能需要几分钟)
call npm install
if errorlevel 1 (
    echo [错误] npm install 失败！
    pause
    exit /b 1
)
echo       依赖安装完成
echo.

echo [3/5] 构建前端资源...
call npm run build
if errorlevel 1 (
    echo [错误] 前端构建失败！
    pause
    exit /b 1
)
echo       前端构建完成
echo.

echo [4/5] 打包 Windows 应用程序...
call npx electron-builder --win --x64
if errorlevel 1 (
    echo [错误] 打包失败！
    pause
    exit /b 1
)
echo       打包完成
echo.

echo ==========================================
echo   构建成功！
echo ==========================================
echo.
echo 生成的文件：
echo   releaseelease-setup.exe  ^(安装程序^)
echo   releaseeleaseelease-win-unpackedun.exe  ^(免安装版^)
echo.

:: 打开 release 目录
if exist "release" (
    explorer "release"
)

echo 按任意键退出...
pause >nul
