---
tags:
  - Homelab
  - Openwrt
  - Network
published: 2026-09-21
description: 记录一些路由器的刷机与配置，有新设备会更新
title: 玩路由丶Router
draft: false
image: ./index.jpg
category: Homelab
---
# 目录

[极路由3](#极路由3)

[斐讯K3](#斐讯K3)

[小米AX3000](#小米AX3000)

[领势WRT1200AC](#领势WRT1200AC)

神秘J1900小主机（待更新，我懒了）

# 极路由3

```txt
解锁SSH --> 可选固化SSH --> 刷入breed到Uboot分区 --> breed刷自定义固件
```

## 开启SSH与固化

[工具源链接](https://www.right.com.cn/FORUM/thread-8268438-1-1.html)

需要多试几次，开启后有5分钟有效期，可通过开启dropbear服务固化

```bash
/etc/init.d/dropbear enable
/etc/init.d/dropbear start
```

## 刷入breed

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

## 刷入固件

在[OpenWrt firmware-selector](https://firmware-selector.openwrt.org/)找`HiWiFi HC5861`对应Sysupgrade固件下载并刷入即可

# 斐讯K3

```txt
导入开启Telnet配置文件 --> 刷入官root固件 --> 刷入自定义固件
```

[原帖链接](https://tbvv.net/posts/0101-k3)

## 恢复配置文件

下载原帖`cn.dat`配置文件(国际版选择`us.dat`)

路由器功能设置 --> 备份恢复 --> 恢复文件选择`cn.dat`或`us.dat`

恢复后使用密码`tbvv.net`登录

路由器功能设置 --> 存储管理 --> 用户名改为admin并保存
## 刷入官root固件

路由器功能设置 --> 手动升级 --> 选择固件 --> 上传升级

## 刷入自定义固件

SSH登录路由器，将自定义固件上传到`/tmp`目录，执行

```bash
cat /tmp/yourfilename.trx >/dev/mtdblock6 && reboot
```

如`reboot`无法使用，则等待30秒后手动断电重启

# 领势WRT1200AC

在[OpenWrt firmware-selector](https://firmware-selector.openwrt.org/)找`Linksys WRT1200AC`的Factory固件直接在原厂后台刷入即可

在主分区运行系统时会将OpenWrt刷入辅助分区，可重启三次切换分区或使用`luci-app-advanced-reboot`程序选择启动分区