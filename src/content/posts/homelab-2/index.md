---
tags:
  - Homelab
  - ESXi
  - Linux
  - ProxmoxVE
  - NAS
  - Openwrt
  - Server
  - Cloudflare
  - IPv6
description: 更新我的Homelab架构，包括带宽升级、对外服务优化、硬件迁移等。包含部分教学与记录遇到的问题
title: 我的 Homelab 架构更新：万兆内网 / 对外服务优化 / 硬件升级 / 弱电线路改造
published: 2026-05-29
draft: false
category: Homelab
image: ./index-1.png
---
从上次记录我的Homelab架构已超过了半年，本篇具体讲软硬件更新与遇到的问题。

# 硬件与基础设施

## 升级万兆内网和配置全屋WIFI

我的服务器和入网设备均放置于地下室，使用一根室内光纤(运营商入网常见)和一根超六类(CAT 6A)屏蔽网线从地下室拉回家里，这两根线均插入`希力威视SR-ST3408F`万兆交换机。

![](src/content/posts/homelab-2/index.png)

在家里安装了10G全光交换机`TP-LINK ST1008F`与`绿联75291千兆PoE`电交换机，分别插入上来的光纤与网线

![](src/content/posts/homelab-2/index-1.png)

### 光链路设备选择

在家中五个位置预留了同样的光纤到弱电箱。光模块选择了7对`HUAWEI LTF2305-BH+ 10G-1270TX/1330RX-10km-SM-eSFP-BBU`和`HUAWEI LTF3205-BH+ 10G-1330TX/1270RX-10km-SM-eSFP-RRU`LC单模单芯BIDI模块
*此处只有商家图片不宜展示* 

交换机为上述的`TP-LINK ST1008F`，非网管

网卡选择了`希力威视SR-PT01-82599-F`，使用`Intel 82599`芯片
### 全屋WIFI设备选择

五个位置也同时预留了相同的超六类网线。选择了PoE交换机(上述)+AP方案，AP选择`TP-LINK TL-7AP5102HI-PoE 薄款（方）易展版` ，配置了相同的SSID与密码并开启`802.11r`

频段调整：

| 位置  | 2.4G | 5G      |
| --- | ---- | ------- |
| 阳台  | 1    | 36      |
| 主卧  | 6    | 149     |
| 次卧  | 11   | 52(DFS) |
| 客厅  | 1    | 157     |
| 书房  | 6    | 44      |

但这款AP的FAT模式仅支持`802.11r`，并没有`802.11k`和`802.11v`，效果并不是很优秀，没有选择AC+AP的原因是购买的`TP-LINK TL-R5009PE-AC`不支持交换机模式，即使用上级路由DHCP。

## 更换Proxmox VE 主机硬件

原本使用`浪潮SA5212M4`机架式服务器，但碍于两台同时工作的噪音和地下室温度，我将其更换为家用硬件和塔式机箱，当时服务重心在另一台`戴尔R730XD`上，我希望先转移大部分服务，最后将另一台也替换为家用硬件。

![](src/content/posts/homelab-2/index-4.jpg)

### 硬件列表

CPU: AMD Ryzen Threadripper 3970X

RAM: KINGBANK DDR4 3200 32G x2

GPU:  NVIDIA GeForce RTX 3080 LHR

Disk: GreatWall GW3500 1TB & GreatWall GW600 1TB

### 配置网卡

在更换硬件后由于网卡名称更换，需要重新配置

我的主板有两块板载网卡，需要先找到插入网线的网卡名称：

```bash
# 查看所有网卡
ip link
```

![](src/content/posts/homelab-2/index-2.png)

找到类似enp…或者eth…的物理网卡，我这里有`enp68s0`和`enp70s0`，下一步检查是否有网络接入：

```bash
# 使用ethtool检测
ethtool enp68s0
ethtool enp70s0
```

![](src/content/posts/homelab-2/index-3.png)

`Link detected: yes`表示有网络接入，下一步修改`/etc/network/interfaces`

```bash
# 编辑配置文件
nano /etc/network/interfaces
```

默认是`vmbr0`桥接物理网卡的，在`vmbr0`下更改`bridge-ports`为刚才有链路的网卡名称`enp70s0`，同样在上面修改`iface enp70s0 inet manual`

#### 修复`Intel 82599`网卡问题

更换光网卡后光模块一直是无发光仅收光的状态，先使用命令重启临时使用：

```bash
ip link set enp33s0 down && sleep 2 && ip link set enp33s0 up
```

然后允许网卡支持非Intel认证的模块：

```bash
echo "options ixgbe allow_unsupported_sfp=1" > /etc/modprobe.d/ixgbe.conf
update-initramfs -u
```

# 软件服务与网络优化

在以前ESXi中有一台被排除代理的虚拟机，运行大部分的服务，我将这些服务迁移到了单独的LXC上。另外我以前的内网穿透方案是cloudflare tunnel，发现Cloudflare回源移动IPv6走HKG后我更改了部分服务的穿透方案。
我会展示部分服务更改回源方案和迁移的过程。

## Umami迁移

我使用Docker安装并使用PostgreSQL，先进入到PostgreSQL容器备份数据库并拷贝：

```bash
# umami-db为容器名
docker exec -t umami-db pg_dump -U umami umami > umami_backup.sql
# 拷贝到另一个服务器
scp umami_backup.sql user@new-server:/path
```

复制compose文件到新服务器：

```bash
# 编辑compose文件
nano docker-compose.yml
# 启动容器以初始化数据库
docker compose up -d
# 删除已有的表
docker exec -it umami-db psql -U umami -d umami -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
# 关闭Umami容器防止读写数据库
docker compose stop umami
# 导入备份的sql文件
docker exec -i umami-db psql -U umami -d umami < umami_backup.sql
# 重启Umami
docker compose start umami
```

## 使用lucky配置IPv6 DDNS与Cloudflare TLS回源

安装可参考[官方文档](https://lucky666.cn/docs/install)，这里会使用lucky配置DDNS和反向代理，最后达成回源部分也保持TLS加密

### 配置DDNS

在WebUI左侧选择动态域名-添加任务，选择对应的DNS托管商，开启`{ipv6Addr}`，选择通过网卡获取，添加同步记录，写入你的域名：

![](src/content/posts/homelab-2/index-5.png)

### 下载边缘证书并配置反向代理

为了保持回源阶段也保持TLS加密，需要先将Cloudflare域名管理中的加密模式调整为 完整 或 完整（严格）：

![](src/content/posts/homelab-2/index-8.png)

然后下载边缘证书，对比自签证书或CA签发证书好处是不用经常续期（最高15年有效期）和更高的安全性：

![](src/content/posts/homelab-2/index-9.png)

![](src/content/posts/homelab-2/index-10.png)

选择PEM格式并将证书保存为`*.crt`文件，密钥保存为`*.key`文件。
在Lucky后台SSL/TLS证书页面上传证书文件：

![](src/content/posts/homelab-2/index-11.png)

在Lucky后台Web服务页面配置反向代理：
监听类型选择IPv6，TLS开启，监听端口选择一个未被占用的非标端口（常规端口会被运营商屏蔽入站），前端地址填入你希望使用的域名

![](src/content/posts/homelab-2/index-12.png)

### 配置DNS记录与Origin Rules

添加对应域名的DNS记录，CNAME类型，写入上面配置的DDNS域名，开启代理：

![](src/content/posts/homelab-2/index-13.png)

默认完整加密会回源源站的443端口，需要配置Origin Rules回源非标端口：
自定义筛选表达式 主机名 等于 对应的域名
目标端口 重写到 配置的端口

![](src/content/posts/homelab-2/index-14.png)

![](src/content/posts/homelab-2/index-15.png)

