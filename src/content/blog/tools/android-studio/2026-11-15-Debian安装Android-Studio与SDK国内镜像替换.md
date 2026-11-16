---
title: Debian 安装 Android Studio 与 SDK 国内镜像替换
date: '2026-11-15'
description: >-
  用官方 Linux tar.gz 安装 Android Studio 到 ~/workspace/apps，处理 SDK 下载超时，
  用腾讯云镜像手动下载组件，并补齐 package.xml 让 Studio 识别已安装包。
tags:
  - Android Studio
  - Android SDK
  - Debian
  - 国内镜像
categories:
  - 工具
---

## 目标

在 Debian 桌面环境安装 **Android Studio**，并把 SDK 组件装到固定目录。国内直连 `dl.google.com` 很容易超时，本文记录一套可复现的做法：

| 路径 | 用途 |
|---|---|
| `~/workspace/apps/android-studio` | IDE 安装目录（与 idea / clion / goland 同级） |
| `~/Android/Sdk` | Android SDK 根目录 |
| `~/Downloads/android-sdk-pkgs` | 镜像下载的 zip 缓存 |
| `~/.local/share/applications/android-studio.desktop` | 应用菜单入口 |

下文以 **Android Studio AI**（`android-studio-rabbit2-patch1-linux`，build `AI-262.10968.63.2622.16840690`）为例。

## 安装 Android Studio

### 下载

官方 Linux 包是 `.tar.gz`。下载后确认：

```bash
ls -lh ~/Downloads/android-studio-*-linux.tar.gz
# 示例：android-studio-rabbit2-patch1-linux.tar.gz 约 1.5G
```

查看压缩包顶层目录名（官方包顶层固定为 `android-studio/`）：

```bash
tar -tzf ~/Downloads/android-studio-rabbit2-patch1-linux.tar.gz | head
# android-studio/
# android-studio/bin/studio.sh
# ...
```

### 解压安装

与本机其他 JetBrains IDE 一样，解压到 `~/workspace/apps`，保留顶层目录名 `android-studio`：

```bash
tar -xzf ~/Downloads/android-studio-rabbit2-patch1-linux.tar.gz \
  -C ~/workspace/apps

ls ~/workspace/apps/android-studio/bin/studio.sh \
   ~/workspace/apps/android-studio/bin/studio.svg

cat ~/workspace/apps/android-studio/build.txt
# AI-262.10968.63.2622.16840690
```

启动：

```bash
~/workspace/apps/android-studio/bin/studio.sh
```

首次启动会初始化配置目录（随版本变化）：

```text
~/.config/Google/AndroidStudio2026.2.2
```

### 桌面入口

```bash
cat > ~/.local/share/applications/android-studio.desktop <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Android Studio
Name[zh_CN]=Android Studio
Comment=Google Android Studio
Exec=$HOME/workspace/apps/android-studio/bin/studio.sh %f
Icon=$HOME/workspace/apps/android-studio/bin/studio.svg
Terminal=false
Categories=Development;IDE;
StartupWMClass=jetbrains-studio
StartupNotify=true
EOF

update-desktop-database ~/.local/share/applications 2>/dev/null || true
```

之后可在应用菜单搜索 Android Studio。

## SDK Location 不能是根目录

向导里若出现：

```text
The Android SDK location cannot be at the filesystem root.
```

说明 **Android SDK Location** 被填成了 `/`，或路径被截断为空。改成：

```text
/home/<你的用户名>/Android/Sdk
```

本机约定即 `/home/jiang/Android/Sdk`。不要选 `/`，也不要只写 `/home`。

## SDK 组件下载超时

首次向导会拉一批组件，例如：

- Android Emulator
- Android SDK Platform 37.0
- Sources for Android 37.0
- Android SDK Build-Tools 36
- Android SDK Platform-Tools
- Google Play Intel x86_64 Atom System Image

国内直连 Google 时经常出现：

```text
java.net.SocketTimeoutException: Read timed out
Warning: An error occurred while preparing SDK package ...
```

结果是 `~/Android/Sdk` 里只有空壳目录和 `.temp/*.asdownload` 半成品（往往只有几百 KB），Studio 仍提示「No packages found」。

此时不要反复点重试，改用 **国内镜像手动下载 + 解压替换**。

## 选哪个国内镜像

实测若干镜像后（以本机网络为准）：

| 镜像 | 结论 |
|---|---|
| 清华 `mirrors.tuna.tsinghua.edu.cn/android/repository/` | 对具体 zip 多为 404 |
| 阿里云 `mirrors.aliyun.com/android/repository/` | 对具体 zip 多为 404 |
| 中科大 / 交大等 | 403 或 404 |
| **腾讯云** `https://mirrors.cloud.tencent.com/AndroidSDK/` | **可用，HTTP 200** |
| 官方 `dl.google.com` | 本机直连失败 |

优先用腾讯云。系统镜像在子路径：

```text
https://mirrors.cloud.tencent.com/AndroidSDK/sys-img/google_apis_playstore/
```

仓库清单也可从同一域名拉（便于核对文件名与 SHA1）：

```bash
# 主仓库
curl -fsSL -o /tmp/repository2-3.xml \
  https://mirrors.cloud.tencent.com/AndroidSDK/repository2-3.xml

# Google Play 系统镜像目录
curl -fsSL -o /tmp/sys-img2-5.xml \
  https://mirrors.cloud.tencent.com/AndroidSDK/sys-img/google_apis_playstore/sys-img2-5.xml
```

## 对照 Studio 半成品，确定要下的文件名

超时后，`Sdk/.temp/PackageOperation*/` 里会留下官方文件名，例如：

| 半成品名 | 完整包 |
|---|---|
| `emulator-linux_x64-16740729.zip.asdownload` | Emulator |
| `platform-37.0_r02.zip.asdownload` | Platform 37.0 |
| `source-37.0_r02.zip.asdownload` | Sources 37.0 |
| `build-tools_r36_linux.zip.asdownload` | Build-Tools 36 |
| `platform-tools_r37.0.1-linux.zip.asdownload` | Platform-Tools |
| `x86_64-37.0_r08.zip.asdownload` | Play x86_64 系统镜像 |

版本号以你本机 `.asdownload` / 向导清单为准，下文命令可按实际文件名替换。

## 从腾讯云下载

建议先建缓存目录，**逐个下载**（并行容易被镜像重置连接，`curl: (56) Connection reset by peer`）：

```bash
BASE=https://mirrors.cloud.tencent.com/AndroidSDK
DL=~/Downloads/android-sdk-pkgs
mkdir -p "$DL/sys-img/google_apis_playstore"
cd "$DL"

# 先探测大小（Content-Length）
curl -sI "$BASE/emulator-linux_x64-16740729.zip" | grep -i content-length

# 断点续传下载（失败可重复执行）
curl -L --connect-timeout 30 --retry 8 --retry-delay 2 --retry-all-errors \
  -C - -o emulator-linux_x64-16740729.zip \
  "$BASE/emulator-linux_x64-16740729.zip"

curl -L -C - -o platform-37.0_r02.zip \
  "$BASE/platform-37.0_r02.zip"

curl -L -C - -o source-37.0_r02.zip \
  "$BASE/source-37.0_r02.zip"

curl -L -C - -o build-tools_r36_linux.zip \
  "$BASE/build-tools_r36_linux.zip"

curl -L -C - -o platform-tools_r37.0.1-linux.zip \
  "$BASE/platform-tools_r37.0.1-linux.zip"

curl -L -C - -o sys-img/google_apis_playstore/x86_64-37.0_r08.zip \
  "$BASE/sys-img/google_apis_playstore/x86_64-37.0_r08.zip"
```

系统镜像大约 **2.1G**，其余合计约几百 MB。下完后用仓库里的 SHA1 校验（示例）：

```bash
# 从 sys-img2-5.xml / repository2-3.xml 里抄 checksum
sha1sum emulator-linux_x64-16740729.zip
sha1sum platform-37.0_r02.zip
sha1sum source-37.0_r02.zip
sha1sum sys-img/google_apis_playstore/x86_64-37.0_r08.zip
```

## 清理半成品并解压到 SDK

```bash
SDK=~/Android/Sdk
DL=~/Downloads/android-sdk-pkgs

# 清掉超时留下的空壳与 .temp
rm -rf "$SDK"/{build-tools,emulator,platforms,platform-tools,sources,system-images,.temp}
rm -rf "$SDK"/emulator-2 "$SDK"/sources/android-*-2 2>/dev/null
mkdir -p "$SDK"/{licenses,build-tools,platforms,sources,system-images}

# Platform-Tools / Emulator：zip 根目录即目标目录名
unzip -qo "$DL/platform-tools_r37.0.1-linux.zip" -d "$SDK"
unzip -qo "$DL/emulator-linux_x64-16740729.zip" -d "$SDK"

# Platform：得到 platforms/android-37.0/
unzip -qo "$DL/platform-37.0_r02.zip" -d "$SDK/platforms"

# Build-Tools：zip 内常为 android-16/，需改名为版本号
tmpdir=$(mktemp -d)
unzip -qo "$DL/build-tools_r36_linux.zip" -d "$tmpdir"
mv "$tmpdir"/android-* "$SDK/build-tools/36.0.0"
rm -rf "$tmpdir"

# Sources：zip 根多为 src/，内容装进 sources/android-37.0/
mkdir -p "$SDK/sources/android-37.0"
tmpdir=$(mktemp -d)
unzip -qo "$DL/source-37.0_r02.zip" -d "$tmpdir"
if [ -f "$tmpdir/src/source.properties" ]; then
  shopt -s dotglob
  mv "$tmpdir/src"/* "$SDK/sources/android-37.0/"
else
  mv "$tmpdir"/* "$SDK/sources/android-37.0/"
fi
rm -rf "$tmpdir"

# 系统镜像：解压后得到 x86_64/
mkdir -p "$SDK/system-images/android-37.0/google_apis_playstore"
unzip -qo "$DL/sys-img/google_apis_playstore/x86_64-37.0_r08.zip" \
  -d "$SDK/system-images/android-37.0/google_apis_playstore"
```

接受许可证（至少写入常用几项，避免后续 sdkmanager / 向导反复弹）：

```bash
mkdir -p "$SDK/licenses"
printf '%s\n' '24333f8a63b6825ea9c5514f83cbf8fcec814b92' \
  > "$SDK/licenses/android-sdk-license"
```

冒烟检查：

```bash
"$SDK/platform-tools/adb" version
"$SDK/emulator/emulator" -version | head -1
test -f "$SDK/platforms/android-37.0/android.jar" && echo platform OK
test -f "$SDK/system-images/android-37.0/google_apis_playstore/x86_64/system.img" \
  && echo sys-img OK
```

## 补 package.xml，否则 Studio「认不出来」

只解压 zip 时，目录里通常只有 `source.properties`。  
**Studio 判断「已安装」主要靠各包目录下的 `package.xml`。**  
缺了它，向导仍会列出同一组件要再下几百 MB / 几 GB——即使文件已经在磁盘上。

`platform-tools`、`build-tools` 若曾被 Studio 成功装过，可能已有 `package.xml`；手动装的 **emulator / platforms / sources / system-images** 往往没有。

### 修订号要对齐官方仓库

系统镜像最容易踩坑：zip 名是 `x86_64-37.0_r08.zip`，官方 catalog 里 `<revision><major>8</major>`，但包内 `source.properties` 有时写成 `Pkg.Revision=7`。  
若 `package.xml` 也写成 7，Studio 会认为本地不是要的版本，继续提示下载 **Google Play Intel x86_64 Atom System Image（约 2.08 GB）**。

先改 `source.properties`：

```bash
IMG=~/Android/Sdk/system-images/android-37.0/google_apis_playstore/x86_64
sed -i 's/^Pkg.Revision=.*/Pkg.Revision=8/' "$IMG/source.properties"
```

### 写入 package.xml（示例）

路径与类型必须与官方 `remotePackage path=...` 一致：

| 组件 | path |
|---|---|
| Emulator | `emulator` |
| Platform 37.0 | `platforms;android-37.0` |
| Sources 37.0 | `sources;android-37.0` |
| Play x86_64 镜像 | `system-images;android-37.0;google_apis_playstore;x86_64` |

系统镜像示例（xmlns 可与本机已有 `platform-tools/package.xml` 对齐；`revision` 必须是 **8**）：

```bash
IMG=~/Android/Sdk/system-images/android-37.0/google_apis_playstore/x86_64
cat > "$IMG/package.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ns2:repository xmlns:ns2="http://schemas.android.com/repository/android/common/02"
  xmlns:ns5="http://schemas.android.com/repository/android/generic/02"
  xmlns:ns14="http://schemas.android.com/sdk/android/repo/sys-img2/05"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <license id="android-sdk-license" type="text"/>
  <localPackage path="system-images;android-37.0;google_apis_playstore;x86_64" obsolete="false">
    <type-details xsi:type="ns14:sysImgDetailsType">
      <api-level>37.0</api-level>
      <extension-level>22</extension-level>
      <base-extension>true</base-extension>
      <tag>
        <id>google_apis_playstore</id>
        <display>Google Play</display>
      </tag>
      <vendor>
        <id>google</id>
        <display>Google Inc.</display>
      </vendor>
      <abi>x86_64</abi>
      <abis>x86_64</abis>
      <translatedAbis>arm64-v8a</translatedAbis>
    </type-details>
    <revision><major>8</major></revision>
    <display-name>Google Play Intel x86_64 Atom System Image</display-name>
    <uses-license ref="android-sdk-license"/>
  </localPackage>
</ns2:repository>
EOF
```

Emulator / Platform / Sources 同理：对照 `repository2-3.xml` 里对应 `remotePackage`，把 `remotePackage` 改成 `localPackage`，去掉 `archives`，补上正确的 `type-details` 与 `revision`。

写完后在向导里 **Back → Next** 刷新；若仍显示待下载，先取消下载，打开：

**Settings → Languages & Frameworks → Android SDK**

确认 SDK Location 仍是 `~/Android/Sdk`，看对应组件是否已是 Installed。向导有时会缓存旧的待下载列表，SDK Manager 重新扫描更准。

## 目录结构核对

装好后大致如下：

```text
~/Android/Sdk/
├── build-tools/36.0.0/
├── emulator/
├── licenses/
├── platforms/android-37.0/
├── platform-tools/
├── sources/android-37.0/
└── system-images/android-37.0/google_apis_playstore/x86_64/
```

每个组件目录下应有 `source.properties`，并尽量有 `package.xml`。
