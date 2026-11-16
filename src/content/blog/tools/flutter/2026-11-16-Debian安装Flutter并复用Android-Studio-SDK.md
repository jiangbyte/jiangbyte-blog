---
title: Debian 安装 Flutter 并复用 Android Studio SDK
date: '2026-11-16'
description: >-
  在 Debian 上按 workspace SDK 约定安装 Flutter stable，复用本机 Android Studio 与 ~/Android/Sdk，
  全程走国内镜像，并补齐 cmdline-tools、许可证与 Linux desktop 依赖。
tags:
  - Flutter
  - Android SDK
  - Debian
  - 国内镜像
categories:
  - 工具
---

## 目标

在 Debian 桌面环境安装 **Flutter**，用于 Android / iOS 客户端开发（本机只做 Android；iOS 需 macOS）。Android 侧**不另装第二套 SDK**，直接复用已装好的 Android Studio 与 SDK。环境变量沿用本机 `~/workspace/environment` + `~/workspace/sdks` 约定：本体进 `sdks/`，根目录 `*.env` 由 `load.sh` 自动加载。

| 路径 | 用途 |
|---|---|
| `~/workspace/sdks/flutter` | Flutter SDK（stable，目录无版本号，覆盖升级） |
| `~/workspace/environment/flutter.env` | Flutter PATH 与国内镜像变量 |
| `~/workspace/environment/android.env` | 指向现有 Android SDK / Studio |
| `~/workspace/apps/android-studio` | 已安装的 Android Studio |
| `~/Android/Sdk` | 已安装的 Android SDK（Studio 使用同一份） |

前置条件：

- 已按 [Debian 安装 Android Studio 与 SDK 国内镜像替换](/post/tools/android-studio/2026-11-15-debianan-zhuang-android-studioyu-sdkguo-nei-jing-xiang-ti-huan) 装好 Studio 与 `~/Android/Sdk`
- Shell 已通过 `~/.bashrc` source `~/workspace/environment/load.sh`
- 本机有 `git`、`curl`、`unzip`；JDK 可由 Studio 自带 JBR 或 workspace JDK 提供

国内直连 GitHub、`dl.google.com`、`storage.googleapis.com` 很容易超时或中断，下文下载**优先国内镜像**。

## 目录约定回顾

`load.sh` 只扫描 `environment/` 根下的 `*.env`，不递归子目录。新增 SDK 时：

- 安装本体放到 `~/workspace/sdks/<名字>`（单工具、目录名不带版本号）
- 在 `environment/` 根新建 `<名字>.env`，用 `export PATH="$XXX_HOME/bin:$PATH"` 前置路径
- 开新终端，或执行：

```bash
unset WORKSPACE_SDK_ENV_LOADED
source ~/workspace/environment/load.sh
```

不必再改 `~/.bashrc`。

## 安装 Flutter SDK

官方仓库在 GitHub，国内用**清华 Flutter SDK 镜像**浅克隆 `stable` 分支：

```bash
# 若曾失败残留空目录，先清掉
rm -rf ~/workspace/sdks/flutter

git clone https://mirrors.tuna.tsinghua.edu.cn/git/flutter-sdk.git \
  -b stable --depth 1 \
  ~/workspace/sdks/flutter
```

校验入口脚本存在：

```bash
ls -l ~/workspace/sdks/flutter/bin/flutter
```

首次执行 `flutter` 时会再拉 Dart SDK / 引擎产物；若仍走官方存储，会很慢。下一步在 `flutter.env` 里把 git、pub、storage 一并指到国内源。

## 配置 Flutter 环境变量与国内镜像

新建 `~/workspace/environment/flutter.env`：

```bash
export FLUTTER_HOME="/home/jiang/workspace/sdks/flutter"
export PATH="$FLUTTER_HOME/bin:$PATH"

# 国内镜像：git 源 / 引擎产物 / pub 包
export FLUTTER_GIT_URL="https://mirrors.tuna.tsinghua.edu.cn/git/flutter-sdk.git"
export PUB_HOSTED_URL="https://pub.flutter-io.cn"
export FLUTTER_STORAGE_BASE_URL="https://storage.flutter-io.cn"
```

说明：

| 变量 | 作用 |
|---|---|
| `FLUTTER_HOME` + `PATH` | 命令行可用 `flutter` / `dart` |
| `FLUTTER_GIT_URL` | 告诉 Flutter 上游是清华镜像，避免 `flutter doctor` 报 “not a standard remote” |
| `PUB_HOSTED_URL` | `pub get` 走 flutter-io.cn |
| `FLUTTER_STORAGE_BASE_URL` | Dart SDK、引擎、artifacts 走 flutter-io.cn |

生效：

```bash
unset WORKSPACE_SDK_ENV_LOADED
source ~/workspace/environment/load.sh

echo "$FLUTTER_HOME"
echo "$PUB_HOSTED_URL"
echo "$FLUTTER_STORAGE_BASE_URL"
which flutter
```

第一次跑版本号时会下载 Dart SDK（约两百多 MB），应看到从 `storage.flutter-io.cn` 拉取：

```bash
flutter --version
# Flutter 3.50.0 • channel stable • https://mirrors.tuna.tsinghua.edu.cn/git/flutter-sdk.git
# ...
# Tools • Dart 3.14.0 • DevTools ...
```

关掉分析上报（可选）：

```bash
flutter config --no-analytics
```

## 复用本机 Android Studio 与 SDK

不要再建 `~/workspace/sdks/android-sdk`。Studio 与 SDK 路径以本机已有为准：

| 项 | 本机路径 |
|---|---|
| Android Studio | `~/workspace/apps/android-studio`（`bin/studio.sh`） |
| Android SDK | `~/Android/Sdk` |
| Studio 配置里的 SDK | `~/.config/Google/AndroidStudio*/options` 中 `androidSdkAbsolutePath` → `$USER_HOME$/Android/Sdk` |

新建 `~/workspace/environment/android.env`：

```bash
export ANDROID_HOME="/home/jiang/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export ANDROID_STUDIO="/home/jiang/workspace/apps/android-studio"
# cmdline-tools 装好后一并进 PATH；platform-tools 先挂上
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
```

再次加载环境：

```bash
unset WORKSPACE_SDK_ENV_LOADED
source ~/workspace/environment/load.sh

echo "$ANDROID_HOME"
echo "$ANDROID_STUDIO"
adb version   # 来自 ~/Android/Sdk/platform-tools
```

告诉 Flutter 用哪套 SDK / Studio：

```bash
flutter config --android-sdk "$ANDROID_HOME"
flutter config --android-studio-dir "$ANDROID_STUDIO"
```

## 补齐 cmdline-tools

Studio 装好的 SDK 里通常已有 `platform-tools`、`platforms`、`build-tools`、`emulator`、`licenses`，但可能**没有** `cmdline-tools/`。`flutter doctor` 和命令行 `sdkmanager` 需要：

```text
~/Android/Sdk/cmdline-tools/latest/bin/sdkmanager
```

目录层级必须是 `cmdline-tools/latest/`，少一层或多一层都会找不到。

直连 `dl.google.com` 容易 SSL 中断；用**腾讯云 AndroidSDK 镜像**下载（版本号可按镜像目录里实际存在的包调整）：

```bash
SDK="$HOME/Android/Sdk"
TMP="/tmp/android-cmdline-tools"
rm -rf "$TMP"
mkdir -p "$TMP"
cd "$TMP"

# 较新的包示例；若 404 可换成镜像站上已有的 commandlinetools-linux-*_latest.zip
URL='https://mirrors.cloud.tencent.com/AndroidSDK/commandlinetools-linux-13114758_latest.zip'

curl -fL --retry 3 --connect-timeout 20 --max-time 300 -o cmdtools.zip "$URL"
ls -lh cmdtools.zip
file cmdtools.zip   # 应为 Zip archive

unzip -q cmdtools.zip
rm -rf "$SDK/cmdline-tools/latest"
mkdir -p "$SDK/cmdline-tools/latest"

# zip 顶层一般是 cmdline-tools/{bin,lib,...}
if [ -d cmdline-tools/bin ]; then
  mv cmdline-tools/* "$SDK/cmdline-tools/latest/"
else
  SRC=$(find . -maxdepth 3 -type f -path '*/bin/sdkmanager' | head -1 \
    | xargs dirname | xargs dirname)
  mv "$SRC"/* "$SDK/cmdline-tools/latest/"
fi

"$SDK/cmdline-tools/latest/bin/sdkmanager" --version
# 例如：19.0

rm -rf "$TMP"
```

若出现 “SDK XML versions up to 3 but …… version 4” 之类警告，多半是 cmdline-tools 与 Studio 安装的 platform 包代差，一般仍可继续；需要时再换更新的 cmdline-tools zip。

以后增补 SDK 组件，优先在 Android Studio → SDK Manager 勾选，或继续从腾讯云镜像取包装进**同一** `~/Android/Sdk`，不要平行再装一套。

## 接受 Android 许可证

Studio 首次装 SDK 时通常已写过部分 license 文件。换上 cmdline-tools 后，可用：

```bash
yes | sdkmanager --sdk_root="$ANDROID_HOME" --licenses
```

成功时末尾类似：

```text
Accept? (y/N): All SDK package licenses accepted
```

若该命令长时间卡住（多半在拉 Google 仓库列表），可先确认 `~/Android/Sdk/licenses/` 下已有常见文件，例如：

```text
android-sdk-license
android-sdk-preview-license
intel-android-extra-license
```

再重试 `yes | sdkmanager --licenses`。不要为了“过 doctor”去改 Flutter 源码；以 `flutter doctor` 里 Android toolchain 显示 **All Android licenses accepted** 为准。

## 预缓存 Android 产物

在镜像变量已生效的前提下：

```bash
flutter precache --android
```

输出里应出现从 `https://storage.flutter-io.cn` 下载的提示，以及 Material Fonts、Gradle Wrapper、Android SDK artifacts、Flutter SDK 等步骤。完成后本地已具备 Android 构建常用引擎产物，建工程时少卡一次网。

## 补齐 Linux desktop 工具链

`flutter doctor` 在 Linux 上还会检查桌面端依赖。即便只做 Android，装齐后 doctor 更干净，也方便偶尔跑 Linux 桌面调试。

本机若缺 `clang++` / `eglinfo`：

```bash
sudo apt-get update
sudo apt-get install -y clang cmake ninja-build pkg-config \
  libgtk-3-dev mesa-utils liblzma-dev
```

校验：

```bash
which clang++ eglinfo
clang++ --version
eglinfo 2>&1 | head
```

`cmake`、`ninja`、`pkg-config`、`libgtk-3-dev` 若已装过，apt 会提示 already the newest version。

## 验收

重新加载环境后执行：

```bash
unset WORKSPACE_SDK_ENV_LOADED
source ~/workspace/environment/load.sh

flutter --version
flutter doctor -v
```

期望关键项大致如下（版本号随 stable 浮动）：

```text
[✓] Flutter (Channel stable, 3.50.0, ...)
    • Flutter version ... at /home/jiang/workspace/sdks/flutter
    • Upstream repository https://mirrors.tuna.tsinghua.edu.cn/git/flutter-sdk.git
    • FLUTTER_GIT_URL = https://mirrors.tuna.tsinghua.edu.cn/git/flutter-sdk.git
    • Pub download mirror https://pub.flutter-io.cn
    • Flutter download mirror https://storage.flutter-io.cn

[✓] Android toolchain - develop for Android devices (Android SDK version 36.0.0)
    • Android SDK at /home/jiang/Android/Sdk
    • Platform android-37.0, build-tools 36.0.0
    • ANDROID_HOME = /home/jiang/Android/Sdk
    • Java binary at: .../android-studio/jbr/bin/java
    • All Android licenses accepted.

[✓] Linux toolchain - develop for Linux desktop
[✓] Connected device (...)
[✓] Network resources

• No issues found!
```

有真机或模拟器时，`Connected device` 会出现对应 Android 设备；没有设备也不影响 SDK 本身是否装好。

查看 Flutter 已写入的配置：

```bash
flutter config
# android-sdk: /home/jiang/Android/Sdk
# android-studio-dir: /home/jiang/workspace/apps/android-studio
```

## 升级方式

Flutter：

```bash
flutter upgrade
```

因 `FLUTTER_GIT_URL` 指向清华镜像，升级走镜像仓库。若镜像短暂落后官方 stable，以镜像同步进度为准。

Android 组件：

- 优先 Android Studio → Settings → Languages & Frameworks → Android SDK
- 或 `sdkmanager`（PATH 已含 `cmdline-tools/latest/bin`）安装具体包
- 大包下载继续优先 [腾讯云 AndroidSDK 镜像](https://mirrors.cloud.tencent.com/AndroidSDK/)

## 常见问题

### git clone GitHub 失败

现象：`GnuTLS recv error` / TLS 非正常断开。改用清华镜像克隆（见上文），不要反复重试官方 GitHub。

### Dart SDK / artifacts 下载极慢

确认当前 shell 已加载 `flutter.env`：

```bash
echo "$FLUTTER_STORAGE_BASE_URL"
# 应为 https://storage.flutter-io.cn
```

若为空，说明未 source `load.sh`，或开的是未走 bashrc 的非登录环境。

### cmdline-tools 仍找不到

检查真实路径：

```bash
find ~/Android/Sdk/cmdline-tools -type f -name sdkmanager
```

正确示例：

```text
.../Android/Sdk/cmdline-tools/latest/bin/sdkmanager
```

错误示例：`cmdline-tools/bin/sdkmanager`（缺 `latest`）、或 `cmdline-tools/cmdline-tools/latest/...`（多套一层）。

### sdkmanager --licenses 卡住

多半在访问 Google 仓库元数据。可：

- 用 Studio 图形界面接受许可
- 确认 `~/Android/Sdk/licenses` 已有文件后，短超时重试命令行
- 后续包尽量用腾讯镜像 + Studio 安装，减少对 `dl.google.com` 的依赖

### doctor 报 Linux toolchain 红叉

按上文安装 `clang` 与 `mesa-utils`。只做 Android 时该红叉不阻塞 `flutter build apk`，但装齐更省事。
