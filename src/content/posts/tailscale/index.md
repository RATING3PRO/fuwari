---
title: Tailscale配置（软路由与局域网设备方案）
tags:
  - Tailscale
  - Openwrt
  - VPN
published: 2026-03-19
draft: false
image: ./index.png
description: 简单记录Tailscale局域网路由配置，偏向个人用途，参数仅供参考
category: VPN
---
# 主路由OpenWrt

## 安装Tailscale

```bash
# 更新软件列表
opkg update
# 安装tailscale
opkg install tailscale
# 安装tailscaled(如果独立)
opkg install tailscaled
```

## 登录Tailscale

```bash
# 拉起tailscale
tailscale up --netfilter-mode=off  --advertise-routes=CIDR --accept-routes --advertise-exit-node --accept-dns=false
# 复制输出链接登录
```

| 参数                      | 解释                               |
| ----------------------- | -------------------------------- |
| --netfilter-mode=off    | 关闭自动操作防火墙与转发                     |
| --advertise-routes=CIDR | 开启尾网路由，CIDR替换为局域网网段，例如`192.168.1.0/24` |
| --accept-routes         | 允许其他尾网路由                         |
| --advertise-exit-node   | 开启出口节点(全隧道代理)                    |
| --accept-dns=false      | 关闭覆写DNS                          |

## 配置防火墙与接口：

OpenWrt后台-->网络-->接口-->添加新接口

| 选项    | 内容                     |
| ----- | ---------------------- |
| 名称    | 任意                     |
| 接口    | `tailscale0`           |
| 协议    | 不配置协议                  |
| 防火墙设置 | 创建新防火墙区域，例如`tailscale` |

![](src/content/posts/tailscale/index.png)

![](src/content/posts/tailscale/index-1.png)

### 配置防火墙

OpenWrt后台-->网络-->防火墙-->区域

找到刚才添加的`tailscale`区域，点击编辑

| 选项         | 内容          |
| ---------- | ----------- |
| 入站数据       | 接受          |
| 出站数据       | 接受          |
| 区域内转发      | 接受          |
| IP 动态伪装    | 开启          |
| MSS 钳制     | 开启          |
| 涵盖的网络      | `tailscale` |
| 允许转发到目标区域  | LAN区域和WAN区域 |
| 允许来自源区域的转发 | LAN区域       |

![](src/content/posts/tailscale/index-2.png)

# 其他局域网设备搭配路由表

## 安装Tailscale

```bash
# 安装tailscale
curl -fsSL https://tailscale.com/install.sh | sh
```

## 登录Tailscale

```bash
# 拉起Tailscale(参数解释看上方)
tailscale up --advertise-routes=CIDR --accept-routes --advertise-exit-node
```

# 配置静态路由表

例如OpenWrt（其他路由类似）：

OpenWrt后台-->网络-->路由-->添加

其他被路由的尾网一样按下面操作

| 选项   | 内容                 |
| ---- | ------------------ |
| 目标   | `100.64.0.0/10`    |
| 网关   | 上方开启Tailscale的设备IP |
| 路由类型 | unicast            |

![](src/content/posts/tailscale/index-3.png)

# 提示

1：路由失效可尝试`tailscale down`再`tailscale up`

2：默认UDP直连效果可能不佳，强制DERP查看：

[如何强制Tailscale走Derp中转](https://linux.do/t/topic/752216)

OpenWrt上的配置：

编辑`/etc/init.d/tailscale`

在`procd_set_param env TS_DEBUG_FIREWALL_MODE="$fw_mode"`下面一行添加`procd_set_param env TS_DEBUG_ALWAYS_USE_DERP=true`

保存并重启tailscale：`tailscale down && tailscale up`

3：自建DERP部分下次再说，可以参考视频：

[Tailscale玩法之内网穿透、异地组网、全隧道模式、纯IP的双栈DERP搭建、Headscale协调服务器搭建，用一期搞定，看一看不亏吧？](https://www.bilibili.com/video/BV1Wh411A73b)

