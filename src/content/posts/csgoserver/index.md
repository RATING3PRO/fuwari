---
tags:
  - Homelab
  - CSGO
  - Game
  - Server
  - Linux
published: 2026-02-14
title: Linux 搭建 CSGO 内网服务器完整教程（含插件、1v1 模式与武器修改）
image: ./index.png
draft: false
category: Game
description: 记录一次在内网环境中部署 CSGO 服务器的完整过程：使用 Linux + SteamCMD 构建专用服务器，结合 SourceMod 插件实现武器替换、1v1 模式与管理菜单扩展，并优化 128 Tick 与网络参数。本文更偏向真实踩坑记录与架构实践。
---
前两天翻B站收藏夹发现几年前收藏了一个搭建CSGO服务器的视频，打算在CS2时代试一下，发现还有不少问题
# 环境准备

建议使用Debian/Ubuntu，虚拟机/LXC均可，2核CPU 4G内存完全够用
使用ssh连接会方便调试
# 安装SteamCMD和CSGO Dedicated Server

建议先创建一个其他用户，不建议使用root：

```bash
# 用户名csgo可更改
useradd -m csgo
# 进入csgo用户(接下来在这个用户执行命令)
sudo -iu csgo
```

如果接下来遇到权限问题，例如使用其他用户编辑了文件，可使用下面命令修复

```bash
# 改为你的用户和服务器文件夹位置
sudo chown -R csgo:csgo "/home/csgo/Steam/steamapps/common/Counter-Strike Global Offensive Beta - Dedicated Server/"
```

## 安装steamcmd：

Debian：

```bash
# 更新包索引
sudo apt update
# 安装仓库管理工具
sudo apt install software-properties-common
# 添加 non-free 仓库
sudo apt-add-repository non-free
# 启用 i386 架构支持(32bit)
sudo dpkg --add-architecture i386
# 再次更新包索引
sudo apt update
# 安装steamcmd
sudo apt install steamcmd
```

Ubuntu：

```bash
# 添加multiverse 仓库
sudo add-apt-repository multiverse
# 启用 i386 架构支持(32bit)
sudo dpkg --add-architecture i386
# 更新包索引
sudo apt update
# 安装steamcmd
sudo apt install steamcmd
```

其他系统参考[Valve Developer Community](https://developer.valvesoftware.com/wiki/SteamCMD)，本文其他命令仍然以Debian/Ubuntu为例

## 安装CSGO Dedicated Server

```bash
# 进入steamcmd
steamcmd
# 通过anonymous登录
login anonymous
# 安装CSGO Dedicated Server(需要一些时间)
app_update 740 validate
# 退出steamcmd
quit
```

# 配置服务端并测试

仍然在csgo用户下进行：

```bash
#进入cfg目录
cd "/home/csgo/Steam/steamapps/common/Counter-Strike Global Offensive Beta - Dedicated Server/csgo/cfg"
#新建或编辑server.cfg
nano server.cfg
```

写入：
```cfg
// 服务器名称(可留空)
hostname "CSGO LAN Server"
// 远程控制密码(不建议留空)
rcon_password "yourpassword"
// 进入服务器密码(按需设置)
sv_password ""
// 仅局域网服务器模式(建议设置，否则需要设置GSLT并向Valve master注册，不适合安装某些插件)
sv_lan 1
// 关闭作弊(游戏中可在控制台或rcon开启)
sv_cheats 0
// 锁128tick
sv_mincmdrate 128
sv_minupdaterate 128
sv_maxupdaterate 128
// 允许服务器分发地图等文件(可选)
sv_allowdownload 1
sv_allowupload 1
// 队伍平衡(可选)
mp_autoteambalance 1
// 游戏模式和规则
// 回合分钟数(可按需设置)
mp_roundtime 2  
mp_roundtime_defuse 2
// 最大回合数(按需调整，30即16胜)
mp_maxrounds 30
// 禁用挂机等违规踢出(按需修改)
mp_autokick 0
// 禁用TK处罚(按需修改)
mp_tkpunish 0
// CT默认手枪设置(USP:weapon_usp_silencer|P2000:weapon_p2000)
mp_ct_default_secondary weapon_usp_silencer
```

删除服务器自带不兼容的libgcc，调用系统的libgcc：

```bash
# 安装32 位库(安装steamcmd时应附带安装)
sudo apt-get install -y libgcc-s1:i386 libstdc++6:i386
# 改名自带的旧 libgcc
cd "/home/csgo/Steam/steamapps/common/Counter-Strike Global Offensive Beta - Dedicated Server/bin"
mv libgcc_s.so.1 libgcc_s.so.1.bak
```

测试启动服务器：

```bash
# 进入目录
cd "/home/csgo/Steam/steamapps/common/Counter-Strike Global Offensive Beta - Dedicated Server"
# 使用srcds启动服务器(必须指定bash避免pushd和popd不存在)，下方参数解释
bash ./srcds_run \
-game csgo \
-console \
-usercon \
-port 27015 \
-tickrate 128 \
-maxplayers_override 20 \
+game_type 0 \
+game_mode 1 \
+mapgroup mg_active \
+map de_dust2 \
+sv_lan 1 \
+sv_setsteamaccount 0
```

| 参数                      | 解释                                      | 类型    |
| ----------------------- | --------------------------------------- | ----- |
| -game csgo              | 加载/csgo/目录资源（指定游戏）                      | 引擎参数  |
| -console                | 启用文本控制台（禁用图形界面）                         | 引擎参数  |
| -usercon                | 允许远程rcon控制（在客户端更改sv_cheats等参数）          | 引擎参数  |
| -port 27015             | 指定端口（默认27015），如更改，客户端连接也需指定端口           | 引擎参数  |
| -tickrate 128           | 128tick                                 | 引擎参数  |
| -maxplayers_override 20 | 玩家上限                                    | 引擎参数  |
| +game_type 0            | 游戏类型经典（搭配game_mode）                     | 控制台命令 |
| +game_mode 1            | 竞技模式（搭配game_type）                       | 控制台命令 |
| +mapgroup mg_active     | 定义地图池（gamemodes_server.txt）             | 控制台命令 |
| +map de_dust2           | 启动地图dust2（可更改）                          | 控制台命令 |
| +sv_lan 1               | 设置为局域网服务器（不注册Steam master，无需- GSLT，不公开） | 控制台命令 |
| +sv_setsteamaccount 0   | 公网认证（TOKEN为0则不使用，搭配sv_lan 1）            | 控制台命令 |

如果无报错或退出，在CSGO客户端控制台使用connect 你的服务器IP进行连接：

![](src/content/posts/csgoserver/index-1.png)

# 配置tmux分离终端

服务器可正常运行后可配置为tmux管理，否则关闭终端后服务器会停止：

```bash
# 安装tmux
sudo apt install tmux
# 进入csgo用户
sudo -iu csgo
# 通过tmux启动服务器(参数如上)
tmux new-session -d -s csgo \
  -c "/home/csgo/Steam/steamapps/common/Counter-Strike Global Offensive Beta - Dedicated Server" \
  './srcds_run -game csgo -console -usercon -port 27015 -tickrate 128 -maxplayers_override 20 +game_type 0 +game_mode 1 +mapgroup mg_active +map de_dust2 +sv_lan 1 +sv_setsteamaccount 0'
# 连接csgo会话
tmux attach -t csgo
# 停止csgo会话
tmux kill-session -t csgo
```

再次连接仍然使用`tmux attach -t csgo`

或者使用wrapper脚本控制：

复制[脚本](https://raw.githubusercontent.com/RATING3PRO/csgoctl/refs/heads/main/csgoctl)，在`/usr/local/bin/`新建一个文件并粘贴，然后配置权限：

```bash
# 新建文件并粘贴脚本(按需修改脚本中的路径和srcds启动参数)
sudo nano /usr/local/bin/csgoctl
# 配置权限
chmod +x /usr/local/bin/csgoctl
```

```bash
# 启动服务器
csgoctl start
# 关闭服务器
csgoctl stop
# 重启服务器
csgoctl restart
# 进入会话
csgoctl attach
# 查看会话状态
csgoctl status
```

分离终端使用Ctrl+B 和 D。不是Ctrl+D（x
# 配置地图参数、Metamod和Sourcemod

如果服务器稳定运行，可选择安装一些模组提升可玩性
## 下载并安装Metamod和Sourcemod

```bash
# 进入csgo用户
sudo -iu csgo
# 进入文件夹
cd "/home/csgo/Steam/steamapps/common/Counter-Strike Global Offensive Beta - Dedicated Server/csgo"
# 下载并解压Metamod(会自动生成/addons/metamod/目录)
wget https://mms.alliedmods.net/mmsdrop/1.12/mmsource-1.12.0-git1219-linux.tar.gz
tar -xzf mmsource-1.12.0-git1219-linux.tar.gz
# 下载并解压SourceMod(会自动生成/addons/sourcemod/目录)
wget https://sm.alliedmods.net/smdrop/1.11/sourcemod-1.11.0-git6970-linux.tar.gz
tar -xzf sourcemod-1.11.0-git6970-linux.tar.gz
```

重启服务器后进入会话，输入`meta version`和`sm version`查看是否生效：

![](src/content/posts/csgoserver/index-2.png)

## 示例：配置Admin Menu插件

Admin Menu是一个Sourcemod自带的插件，具有管理地图、玩家和执行cfg等功能

### 查看插件状态

在csgo会话中执行`sm plugins list`查看已注入的插件列表，一般会有
[ xx ] Admin Menu (1.11.0.xxxx) by AlliedModders LLC，如果没有，查看`addons/sourcemod/plugins/disabled/`目录是否有，并把它取出来，然后执行`sm plugins reload adminmenu.smx`

![](src/content/posts/csgoserver/index-3.png)
### 编辑管理员配置文件

先查看自己的SteamID，可以去`https://steamdb.info/calculator/<你的Steam64ID>`

Steam64 ID通常在你的Steam个人主页路径里面

![](src/content/posts/csgoserver/index-4.png)

或者开一把Valve的早期起源引擎游戏，控制台输入status，可以查看玩家的SteamID，和上方相同

编辑`addons/sourcemod/configs/admin_simple.ini`，按照注释里的说明添加权限：

![](src/content/posts/csgoserver/index-5.png)

保存后回到csgo会话，执行`sm plugins reload adminmenu.smx`重载插件和`sm_reloadadmins`重载管理员

客户端进入游戏，在聊天框输入`!admin`打开管理员面板：

![](src/content/posts/csgoserver/index-6.png)

### 修复图池

默认的图池文件可能会有问题，或者你想通过管理员面板更换其他不在默认图池里的地图，可创建一个新的图池ini文件：

```bash
# 进入csgo用户
sudo -iu csgo
# 在addons/sourcemod/configs/创建maps.ini
nano "/home/csgo/Steam/steamapps/common/Counter-Strike Global Offensive Beta - Dedicated Server/csgo/addons/sourcemod/configs/maps.ini"
```

提供一些自带的地图，复制粘贴即可：

```ini
#########################
# Active Competitive
#########################
de_dust2
de_mirage
de_inferno
de_nuke
de_overpass
de_vertigo
de_ancient
de_anubis

#########################
# Other Defuse
#########################
de_cache
de_train
de_cbble
de_canals
de_lake
de_safehouse
de_bank
de_stmarc
de_shortdust
de_shortnuke

#########################
# Hostage
#########################
cs_office
cs_italy

#########################
# Arms Race
#########################
ar_baggage
ar_shoots
ar_monastery
ar_pool_day
ar_lunacy

#########################
# Demolition
#########################
de_shorttrain
de_sugarcane
de_rialto

#########################
# Flying Scoutsman / Wingman
#########################
dz_blacksite
dz_sirocco
dz_junglety
dz_frostbite
dz_vineyard
dz_ember

#########################
# aim / 1v1 / Workshop
#########################
# workshop/2677944247/aim_map_nuke
# workshop/1901018709/aim_map
# workshop/2132241752/aim_dust1999
# workshop/2271217192/1v1_aim_prison
```

编辑`addons/sourcemod/configs/maplists.cfg`（其他关于地图插件的图池可能也在这里定义），更改sm_map menu的文件为`addons/sourcemod/configs/maps.ini`：

![](src/content/posts/csgoserver/index-7.png)

### 执行cfg

可在`csgo/cfg/`文件夹中创建cfg，例如创建一个1v1.cfg：

```cfg
echo "===== LOADING 1v1 CONFIG ====="

// ---------- 基础 ----------
mp_restartgame 1
mp_autokick 0
mp_autoteambalance 0
mp_limitteams 0
sv_alltalk 1
sv_cheats 1
sv_infinite_ammo 0

// ---------- 经济 ----------
mp_startmoney 16000
mp_maxmoney 16000
mp_afterroundmoney 16000
mp_playercashawards 0
mp_teamcashawards 0
mp_buytime 9999
mp_buy_anywhere 1

// ---------- 回合 ----------
mp_roundtime 1.75
mp_roundtime_defuse 1.75
mp_freezetime 1
mp_maxrounds 52
mp_halftime 0
mp_match_can_clinch 1
mp_ignore_round_win_conditions 0
mp_round_restart_delay 2

// ---------- 热身 ----------
mp_warmuptime 5
mp_warmup_end

// ---------- 战斗 ----------
mp_friendlyfire 0
mp_damage_headshot_only 0
mp_teammates_are_enemies 0

// ---------- 移动 ----------
sv_accelerate 5.5
sv_airaccelerate 1000
sv_enablebunnyhopping 1

// ---------- 掉落 ----------
mp_death_drop_gun 1
mp_death_drop_grenade 0
mp_death_drop_defuser 0

// ---------- BOT 管理 ----------
bot_kick
bot_quota 1
bot_quota_mode match
bot_difficulty 3
bot_allow_grenades 0
bot_allow_snipers 1

// ---------- 生成 ----------
mp_randomspawn 0
mp_respawn_on_death_ct 0
mp_respawn_on_death_t 0

// ---------- 雷达 ----------
mp_radar_showall 1

// ---------- HUD ----------
sv_showimpacts 0
sv_showimpacts_time 4

// ---------- SourceMod ----------
sm_cvar sm_weaponrestrict_immunity 1

// ---------- 完成 ----------
say "[1v1] Config Loaded"
echo "===== 1v1 CONFIG LOADED ====="
```

更改`addons/sourcemod/configs/adminmenu_cfgs.txt`，按原有格式加入新的cfg：

![](src/content/posts/csgoserver/index-8.png)

# 一些插件

- [手套](https://github.com/kgns/gloves)
- [武器](https://github.com/kgns/weapons)
- [探员](https://github.com/Franc1sco/Franug-AgentsChooser)
- [PTaH](https://github.com/komashchenko/PTaH)
- [积分与排名](https://github.com/rogeraabbccdd/Kento-Rankme)
- [还原2022年AWP子弹和M4A1-S射程更新](https://github.com/KoNLiG/UpdateReverter)
- [武器API](https://github.com/KoNLiG/CSWeaponsAPI)
- [简陋的回合伤害统计](https://github.com/RATING3PRO/round_damage)
- [买A4替换为A1](https://github.com/RATING3PRO/M4A4-to-M4A1-S-Replacer)

# 一些注意事项和技巧

1：文中写的配置文件并不都是最优，可以问AI按需修改

2：Legacy Server会有极大的不确定性，做好重要数据的快照及备份

3：文章中的配置文件会在发现更优方案时更新

4：某些插件提供编译好的`.smx`文件，可能不适配你的Sourcemod版本，如果提供`.sp`文件，放入和cd到`addons/sourcemod/scripting/`目录，然后使用`./spcomp your_mod.sp`编译为`.smx`，最后`mv your_mod.smx ../plugins`再重载模组即可

5：部分复杂的插件压缩包会直接包含`addons`和`cfg`等目录，在安装Metamod相同的位置相同的方式解压即可

6：皮肤等插件需要在`addons/sourcemod/configs/core.cfg`文件底部把`"FollowCSGOServerGuidelines"`改为`no`（配置GSLT的不建议改，可能会封禁账号）

7：由于V社复用了CS2和CSGO的AppID，启动项和cfg的路径关系稍微复杂，客户端CSGO想导入cfg可以在`Steam\steamapps\common\Counter-Strike Global Offensive\csgo\cfg`下创建`autoexec.cfg`，这样CS2和CSGO会分别导入自己的`autoexec.cfg`

8：想下载一些工作坊地图可以打开CS2工作坊，搜索地图并在底部开启`显示不兼容项目`，订阅后打开`Counter-Strike Global Offensive\csgo\maps\workshop`，里面有创意工坊id文件夹，里面有`.bsp`文件的就是CSGO可用地图，直接拷贝创意工坊id文件夹到服务器的`Counter-Strike Global Offensive Beta - Dedicated Server/csgo/maps/workshop/`文件夹下（一定要带着创意工坊id的文件夹，没有workshop目录就创建），最后可在上面`maps.ini`的文件中添加地图，像`workshop/2677944247/aim_map_nuke`这样带着路径

9：如果不想每次都输`connect IP`，可以在上面说的`autoexec.cfg`里写入`alias lan "connect YourServerIP"`，这样打开控制台输入`lan`即可连接

10：如果处于远程连接，例如Tailscale等VPN服务的来源IP地址(100.64.0.0/10)可能会在`sv_lan 1`的情况下被拒绝，需要做NAT转发，例如我在尾网路由配置：

```bash
# YOUR_CSGO_SERVER_IP改为服务器IP，eth0改为LAN网卡的名称(查看ip addr)，端口可按需修改
iptables -t nat -A POSTROUTING \
  -s 100.64.0.0/10 \
  -d YOUR_CSGO_SERVER_IP \
  -p udp --dport 27015 \
  -o eth0 \
  -j MASQUERADE
```
# 参考文章

[从零开始的CSGO服务器教程（三）：实战2——全皮肤全贴纸/回防服务器](https://www.bilibili.com/read/cv7409672)

[【CSGO本地端】BetterBots插件个人整合包](https://ncni9avz1yhl.feishu.cn/wiki/TYIqwtABJiYFpfkAXa6cbVDenxI)


