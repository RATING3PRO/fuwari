---
tags:
  - Game
  - CS2
  - Linux
  - Homelab
published: 2026-04-21
description: 记录一次在内网环境中部署 CS2 服务器的过程：使用 Linux + SteamCMD 构建专用服务器，结合MetaMod与CSSharp插件实现功能添加
title: Linux 搭建 CS2 内网服务器教程（含插件框架安装）
draft: false
image: ./index.png
category: Game
---
# 环境准备

建议使用Debian/Ubuntu，推荐版本号小于Debian12/Ubuntu24.04，内存建议不小于6GB

# 安装SteamCMD并下载CS2 Dedicated Server

## 创建用户

先创建一个其他用户用于区分：

```bash
# 用户名csgo可更改
useradd -m csgo
# 为csgo用户分配sudo用户组方便执行sudo命令
sudo usermod -aG sudo csgo
# 进入csgo用户(接下来在这个用户执行所有命令)
sudo -iu csgo
```

如果接下来遇到权限问题，例如使用其他用户编辑了文件，可使用下面命令修复

```bash
# 改为你的用户和服务器文件夹位置
sudo chown -R csgo:csgo "/home/csgo/Steam/steamapps/common/Counter-Strike Global Offensive/"
```

## 安装SteamCMD

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
# 修复bash PATH环境变量（如使用其他用户安装）
echo 'export PATH=$PATH:/usr/games' >> ~/.bashrc && source ~/.bashrc
```

Ubuntu：

```bash
# 添加 multiverse 仓库
sudo add-apt-repository multiverse
# 启用 i386 架构支持(32bit)
sudo dpkg --add-architecture i386
# 更新包索引
sudo apt update
# 安装steamcmd
sudo apt install steamcmd
# 修复bash PATH环境变量（如使用其他用户安装）
echo 'export PATH=$PATH:/usr/games' >> ~/.bashrc && source ~/.bashrc
```

其他系统参考[Valve Developer Community](https://developer.valvesoftware.com/wiki/SteamCMD)

## 安装CS2 Dedicated Server

```bash
# 进入SteamCMD
steamcmd
# 通过anonymous登录
login anonymous
# 安装CS2 Dedicated Server(需要一些时间)
app_update 730 validate
# 退出steamcmd
quit
```

# 环境修复、编辑基础配置文件和游玩测试

修复`steamclient.so`的指向：

```bash
# 创建目录/home/csgo/.steam/sdk64
mkdir -p /home/csgo/.steam/sdk64
# 创建软链接
ln -sf /home/csgo/.local/share/Steam/steamcmd/linux64/steamclient.so /home/csgo/.steam/sdk64/steamclient.so
```

编辑`server.cfg`和`gamemode_competitive_server.cfg`：

```bash
# 进入目录
cd "/home/csgo/Steam/steamapps/common/Counter-Strike Global Offensive/game/csgo/cfg/"
# 编辑server.cfg
nano server.cfg
# 编辑gamemode_competitive_server.cfg
nano gamemode_competitive_server.cfg
```

`server.cfg`参考：

```cfg
// Defaults in server_default.cfg
// --- 基础设置 ---
hostname "CS2 LAN Server"            // 服务器名称
rcon_password "pass"                 // 远程控制密码
sv_password ""                       // 进入服务器密码
sv_lan 1                             // 局域网模式 (1=开启, 0=公网)
sv_cheats 0                          // 禁用作弊                  

// --- 游戏规则与队伍平衡 ---
mp_autoteambalance 1                 // 开启队伍平衡
mp_limitteams 1                      // 队伍人数差异限制
mp_autokick 0                        // 禁用挂机踢出
mp_tkpunish 0                        // 禁用 TK 处罚

// --- 回合与时间设置 ---
mp_maxrounds 24                      // 最大回合数
mp_roundtime 1.92                    // 竞技模式每回合分钟数
mp_roundtime_defuse 1.92             // 拆弹模式每回合分钟数
mp_buytime 15                        // 购买时间
mp_freezetime 15                     // 开局冻结时间

// --- Bot 设置 ---
bot_difficulty 0                     // Bot 难度 (0: 容易, 1: 普通, 2: 困难, 3: 专家)
bot_quota 10                         // 服务器中 Bot 的数量
bot_quota_mode fill                  // 填充模式

writeid
writelog
```

`gamemode_competitive_server.cfg`参考：

```cfg
mp_warmuptime 60 // 热身60秒

bot_quota 10 // Bot数量

bot_quota_mode fill // Bot填充模式

bot_join_after_player 1 //玩家加入后填充Bot

bot_difficulty 0 // Bot 难度 (0: 容易, 1: 普通, 2: 困难, 3: 专家)

mp_autoteambalance 1 // 自动平衡玩家数量

mp_limitteams 1 // 队伍玩家最大数量差
```

测试服务器启动：

```bash
# 进入目录
cd "/home/csgo/Steam/steamapps/common/Counter-Strike Global Offensive/game/bin/linuxsteamrt64"
# 修复Google V8 引擎错误
export WORKDIR="/home/csgo/Steam/steamapps/common/Counter-Strike Global Offensive/game/bin/linux64"
export LD_LIBRARY_PATH="$WORKDIR:$LD_LIBRARY_PATH"
# 启动测试
./cs2 \
-usercon \
-dedicated \
-nomaster \
-port 27015 \
-maxplayers_override 20 \
+game_type 0 \
+game_mode 1 \
+exec server.cfg \
+mapgroup mg_bomb \
+map de_dust2 \
+sv_lan 1
```

参数解释：

| 参数                      | 功能                           |
| ----------------------- | ---------------------------- |
| -usercon                | 启用远程控制台（RCON）                |
| -dedicated              | 以专用服务器（Dedicated Server）模式运行 |
| -nomaster               | 不向 Steam 主服务器注册              |
| -port 27015             | 指定服务器监听的 UDP 端口              |
| -maxplayers_override 20 | 强制设置最大玩家数量为 20               |
| +game_type 0            | 设置游戏类型                       |
| +game_mode 1            | 设置游戏模式                       |
| +exec server.cfg        | 启动时自动执行 server.cfg 配置文件      |
| +mapgroup mg_bomb       | 指定轮换地图组                      |
| +map de_dust2           | 指定服务器启动后的第一张地图               |
| sv_lan 1                | 开启局域网模式                      |

通过tmux管理：

```bash
# 安装tmux
sudo apt install tmux
# 通过tmux启动服务器
tmux new-session -d -s cs2 \
  -c "/home/csgo/Steam/steamapps/common/Counter-Strike Global Offensive/game/bin/linux64" \
  './cs2 -usercon -dedicated -nomaster -port 27015 -maxplayers_override 20 +game_type 0 +game_mode 1 +exec server.cfg +mapgroup mg_bomb +map de_dust2 +sv_lan 1'
# 连接cs2会话
tmux attach -t cs2
# 停止cs2会话
tmux kill-session -t cs2
```

或者使用wrapper脚本控制：[cs2ctl](https://raw.githubusercontent.com/RATING3PRO/csgoctl/refs/heads/main/cs2ctl)

```bash
# 新建文件并粘贴脚本
sudo nano /usr/local/bin/cs2ctl
# 配置权限
chmod +x /usr/local/bin/cs2ctl
```

```bash
# 启动服务器
cs2ctl start
# 关闭服务器
cs2ctl stop
# 重启服务器
cs2ctl restart
# 进入会话
cs2ctl attach
# 查看会话状态
cs2ctl status
```

# 安装MetaMod和CSSharp

```bash
# 进入目录
cd "/home/csgo/Steam/steamapps/common/Counter-Strike Global Offensive/csgo"
# 下载压缩包
wget https://github.com/alliedmodders/metamod-source/releases/download/2.0.0.1396/mmsource-2.0.0-git1396-linux.tar.gz
wget https://github.com/roflmuffin/CounterStrikeSharp/releases/download/v1.0.365/counterstrikesharp-with-runtime-linux-1.0.365.zip
# 解压压缩包(会自动生成目录)
tar -xzf mmsource-2.0.0-git1396-linux.tar.gz
unzip counterstrikesharp-with-runtime-linux-1.0.365.zip
```

编辑`/home/csgo/Steam/steamapps/common/Counter-Strike Global Offensive/csgo/gameinfo.gi`，在`Game    csgo`和`Game    csgo_imported`行的上面添加`Game    csgo/addons/metamod`

重启服务端后输入`meta version`和`meta list`检查状态

