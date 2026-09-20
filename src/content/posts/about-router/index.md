---
tags:
  - Homelab
  - Openwrt
  - Network
published: 2026-09-21
description: 记录一些路由器的刷机与配置
title: 玩路由丶Router
draft: false
image: ./index.jpg
category: Homelab
---
# 目录

[极路由3](#极路由3)

神秘J1900小主机（待更新，我懒了）

## 极路由3

```txt
解锁SSH --> 可选固化SSH --> 刷入breed到Uboot分区 --> breed刷自定义固件
```

### 开启SSH与固化

[工具源链接](https://www.right.com.cn/FORUM/thread-8268438-1-1.html)

需要多试几次，开启后有5分钟有效期，可通过开启dropbear服务固化

```bash
/etc/init.d/dropbear enable
/etc/init.d/dropbear start
```

### 刷入breed

[breed备份仓库](https://github.com/bishiping/hackpascal-breed-backups)

选择`breed-mt7620-hiwifi-hc5861.bin`，使用wget下载或scp上传到路由器

```bash
wget -P /tmp/ https://github.com/bishiping/hackpascal-breed-backups/raw/refs/heads/main/breed-mt7620-hiwifi-hc5861.bin
```

```bash
scp /path/breed-mt7620-hiwifi-hc5861.bin root@192.168.199.1:/tmp/
```

刷入到Uboot

```bash
mtd -r write /tmp/breed-mt7620-hiwifi-hc5861.bin u-boot
```

持续长按重置按钮插入电源等待10秒进入breed

### 刷入固件

在[OpenWrt firmware-selector](https://firmware-selector.openwrt.org/)找`HiWiFi HC5861`对应Sysupgrade固件下载并刷入即可

