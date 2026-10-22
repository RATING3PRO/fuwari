---
title: 玩电话丶Phone
tags:
  - Homelab
  - Network
  - VPN
  - VoIP
  - SIP
  - 含AI生成内容
published: 2026-10-21
description: 关于SIP和FreePBX等软件的配置，和部分Cisco IP Phone的刷机
draft: false
image: ./index.png
category: Homelab
---

很早就想玩VoIP了，之前仅局限与软件客户端，最近买了FXO网关和一些实体电话机，这次就来分享一下搭建过程

本人技术欠佳，请各位多在评论区指正
# 目录

[FreePBX](#FreePBX)

[外线配置](#外线配置)

[Cisco IP Phone 配置](#Cisco电话配置)

# FreePBX

## 安装

建议先安装Debian12再通过脚本安装FreePBX

```bash
su -

cd /tmp

wget https://github.com/FreePBX/sng_freepbx_debian_install/raw/master/sng_freepbx_debian_install.sh  -O /tmp/sng_freepbx_debian_install.sh

bash /tmp/sng_freepbx_debian_install.sh
```

## 配置之前

先进入WebUI做基础的管理员账户创建。如果是私人服务器并且确保安全的情况下，我建议关闭防火墙与fail2ban服务，以免不必要的排错环节：

```bash
su -

# 停止自动恢复防火墙任务
php <<'PHP'
<?php
require '/etc/freepbx.conf';
FreePBX::Firewall()->setConfig('status', false);
FreePBX::Firewall()->removeCronJob();
PHP

# 停止防火墙
rm -f /etc/asterisk/firewall.enabled
fwconsole firewall stop

# 停止防火墙模块
fwconsole ma disable firewall

# 停止fail2ban
systemctl disable --now fail2ban.service
```

## 创建分机

进入Connectivity-->Extensions-->Add Extensions-->New SIP Extensions

![](src/content/posts/about-voip/index-1.png)


| General选项             | 内容                      |
| --------------------- | ----------------------- |
| User Extension        | 用户分机号码，例如1001           |
| Display Name          | 对方显示的名称，例如John          |
| Secret                | 分机注册密码，建议不超过18位，以免设备不支持 |
| User Manager Settings | 可使用户自己在UCP管理分机，可创建对应账户  |
| Language Code         | 分机的系统提示语言               |

| Voicemail选项           | 内容                                |
| --------------------- | --------------------------------- |
| Voicemail             | 语音信箱，默认号码 *97                     |
| Voicemail Password    | 语音信箱密码，只能使用数字，注意可拨入*98 收听其他人的语音信息 |

| Advanced选项            | 内容                          |
| --------------------- | --------------------------- |
| Max Contacts          | 最大的分机注册数量，如果一个用户有多个设备，应按需调整 |
| Remove Existing       | 移除已有的注册设备，建议关闭              |
| Optional Destinations | 无应答/忙线/不可达的回落目的地，可设置为语音信箱   |

| 其他选项                      | 内容                         |
| ------------------------- | -------------------------- |
| Pinless Dialing(PIN Sets) | 免密拨号，例如您设置了外线密码，此项可使分机免密拨出 |

最后Submit-->Apply Config

## 客户端注册分机

| 选项            | 内容              |
| ------------- | --------------- |
| SIP服务器        | FreePBX的IP地址    |
| 用户名           | 分机号码            |
| 域名            | FreePBX的IP地址    |
| 登录名           | 分机号码            |
| 显示名           | 自定义，例如John      |
| 密码            | 分机注册密码          |
| 语音信箱号码        | *97             |
| 传输协议          | 优先选择UDP，其他可后续开启 |
| stun/turn/ice | 在局域网或VPN下通常无需开启 |

## 回音排错

拨打`*43`

## 会议室

Applications --> Conferences

![](src/content/posts/about-voip/index-2.png)
## 邮件配置

如果没有SysAdmin Pro，配置Postfix，下载[python脚本](public/scripts/configure-postfix-relay.py)(AI写的)，使用root用户运行

# 外线配置

我这里使用FXO网关(Linksys SPA3102)，如果有条件，最好直接注册到运营商IMS，避免不必要的损耗

整体架构：

![](src/content/posts/about-voip/index-8.png)

如果没有设备密码，先重置：将一部模拟电话接入设备FXS端口，输入`****`，提示音后输入`73738#`，最后`1`确认

## 网络配置

使用网线将电脑LAN与设备ETH口相连，使用DHCP分配地址，进入`http://192.168.0.1/admin/`，默认没有密码

进入WAN Setup，选择底部advanced界面

![](src/content/posts/about-voip/index-3.png)


| 选项                           | 内容              |
| ---------------------------- | --------------- |
| Internet Connection Settings | Static          |
| Static IP                    | 您局域网的一个空闲IPv4地址 |
| NetMask                      | 对应填写            |
| Gateway                      | 您的网关地址          |
| DNS                          | 按需填写            |
| NTP Server                   | 按需填写            |
| Enable WAN Web Server        | yes             |
最后Submit All Changes

接下来用网线将设备Internet与局域网LAN相连，并将外线插入FXO端口

## PSTN配置

我这里使用外呼`9+号码`和密码验证的方案，呼入则支持转拨到分机并包含回落

进入Voice-->PSTN Line

![](src/content/posts/about-voip/index-4.png)


| 选项                                                       | 内容                                     |
| -------------------------------------------------------- | -------------------------------------- |
| Enable                                                   | yes                                    |
| SIP Transport                                            | SIP传输协议，建议优先选UDP                       |
| SIP Port                                                 | SIP端口，我这里使用5061                        |
| Restrict Source IP                                       | 限制来源IP，建议开启                            |
| Proxy                                                    | 与上一个选项配合使用，填FreePBX的IP+端口              |
| Register                                                 | no，接下来会在FreePBX中设置中继目标                 |
| Make/Ans Call Without Reg                                | yes，固定中继目标时不需要，另外上一项已经关闭注册             |
| Display Name                                             | 自定义                                    |
| User ID                                                  | 与分机User ID类似，我这里设置为`spa3102`           |
| Use Auth ID/Auth ID                                      | 取决于需不需要将Auth ID与User ID区分              |
| Password                                                 | 与FreePBX中继时用的密码                        |
| Preferred Codec                                          | 音频编码，推荐alaw/ulaw                       |
| Use Pref Codec Only                                      | no，不强制使用指定编码，可在下方勾选其他备选编码              |
| Silence Supp Enable                                      | no，静音期间仍发送音频，防止兼容性问题                   |
| DTMF Tx Method                                           | AVT，将按键与提示作为事件发送，详见`RFC4733`           |
| Echo Canc Enable/Echo Canc Adapt Enable/Echo Supp Enable | 回声处理相关，建议开启                            |
| VoIP-To-PSTN Gateway Enable                              | yes，启用VoIP转模拟，整个系统的关键                  |
| VoIP Caller Auth Method                                  | HTTP Digest，用于和FreePBX之间验证             |
| VoIP Access List                                         | 填FreePBX地址                             |
| One Stage Dialing                                        | yes，设备直接拨出对应号码，无需再次输入                  |
| VoIP Caller Default DP                                   | 1，默认使用Dial Plan 1处理拨出号码                |
| VoIP User 1 Auth ID                                      | 对应FreePBX中继的认证名                        |
| VoIP User 1 Password                                     | 对应FreePBX中继的密码                         |
| VoIP User 1 DP                                           | 认证成功后采用Dial Plan 1                     |
| Dial Plan 1                                              | `(xx.)`                                |
| Dial Plan 8                                              | `(S0<:PHONE@FREEPBX-IP:5060>)`         |
| PSTN Answer Delay                                        | 3，拨入后的等待                               |
| VoIP Answer Delay                                        | 0，拨出的等待                                |
| VoIP DLG Refresh Intvl                                   | 30，SIP会话健康检查循环时间                       |
| Detect CPC                                               | yes，检测短暂的挂断无电流                         |
| Min CPC Duration                                         | 0.2，无电流至少持续该秒数才判断为CPC                  |
| Detect Polarity Reversal                                 | no，不使用电话线正负极反转来判断挂断                    |
| Detect Disconnect Tone                                   | yes，检测对方挂断后的忙音                         |
| Detect PSTN/VoIP Long Silence                            | no，不因模拟/VoIP方长时间无声而挂断                  |
| Disconnect Tone                                          | `450@-30,450@-30;4(.35/.35/1+2)`中国联通可用 |
Dial Plan8 这里号码不含国家和市区号，需要与FreePBX中路由的DID一致

最后Submit All Changes

## FreePBX对接

### 添加Trunk

进入FreePBX Connectivity-->Trunks-->Add SIP Trunk

| General选项         | 内容               |
| ----------------- | ---------------- |
| Trunk Name        | 自定义              |
| Outbound CallerID | 自定义              |
| Maximum Channels  | 如果您的设备只有一条外线，就填1 |

| pjsip General选项 | 内容                                         |
| --------------- | ------------------------------------------ |
| Username        | 上方设置的VoIP User 1 Auth ID                   |
| Secret          | 上方设置的VoIP User 1 Password                  |
| Authentication  | Outbound，出站时如需验证则使用上述验证信息                  |
| Registration    | None，不进行注册，上方为设备设置了白名单，此项和Authentication无关 |
| SIP Server      | FXO网关的IP地址                                 |
| SIP Server Port | 设备PSTN-SIP端口，例如上述5061                      |
| Context         | from-pstn                                  |
| Transport       | 与上方设备的传输协议一致                               |

| pjsip Advanced选项 | 内容                       |
| ---------------- | ------------------------ |
| DTMF Mode        | `RFC4733`，与设备AVT对应       |
| From User        | FreePBX发向设备的SIP请求的用户名    |
| Match (Permit)   | `FXO-IP/32`，将此设备的请求识别为中继 |
| Direct Media     | No，让音频经过FreePBX          |
| Rewrite Contact  | Yes，根据源修正联系地址            |
| RTP Symmetric    | Yes，将回程音频转发到对应源          |
| Force rport      | Yes，强制重写端口以解决NAT问题       |

Codecs建议将ulaw和alaw上移

最后Submit-->Apply Config

### 设置PIN

接下来设置外呼PIN，进入Settings-->PIN Sets-->Add PIN Sets

| 选项            | 内容       |
| ------------- | -------- |
| Description   | 自定义      |
| PIN List      | 密码，每行一个  |
| Record In CDR | 无审计需求可关闭 |

Submit-->Apply Config

进入Connectivity-->Outbound Routes-->Add Outbound Routes

| Route Settings选项                  | 内容                      |
| --------------------------------- | ----------------------- |
| Route Name                        | 自定义                     |
| Route CID                         | 建议对应上方Outbound CallerID |
| Trunk Sequence for Matched Routes | 刚刚创建的中继                 |

Dial Patterns 中填写：

| Prepend | Prefix     | Match Pattern | CallerID |
| ------- | ---------- | ------------- | -------- |
| 空       | 外呼时的前缀，例如9 | `X.`          | 空        |

Additional Settings 中选择对应Pin Set

Submit-->Apply Config

### 配置转接与路由

中文提示录音，这里可以用小娜配一个8 kHz、单通道、16bit的wav文件
进入Admin-->System Recordings上传录音

配置呼入转接，进入Applications-->IVR-->Add IVR


| 选项                  | 内容                                   |
| ------------------- | ------------------------------------ |
| IVR Name            | 自定义                                  |
| Announcement        | 刚才设置的中文提示语音                          |
| Enable Direct Dial  | Enabled，启用直拨分机                       |
| Timeout             | 等待输入分机号的时间，建议与提示音一致                  |
| Invalid Retries     | 输入无法匹配的号码的允许重试次数                     |
| Invalid Destination | 无效输入耗尽后的目的地                          |
| Timeout Retries     | 设为0则不重放提示与菜单，直接落回Timeout Destination |
| Timeout Destination | 超时后的目的地，例如Extensions-->1001          |

Submit-->Apply Config

配置呼入路由，进入Connectivity-->Inbound Routes-->Add Inbound Routes

| 选项              | 内容                    |
| --------------- | --------------------- |
| Description     | 自定义                   |
| DID Number      | 与上方Dial Plan8的PHONE一致 |
| CallerID Number | 空                     |
| Set Destination | IVR-->您的配置的呼入路由       |

Submit-->Apply Config

# Cisco电话配置

我购买了两台CP-7945G和一台CP-7841-K9

锁住的配置项通常可使用`**#`解锁

## 7945G

先准备SIP固件，部分EOL的设备可以在[firewall.cx](https://www.firewall.cx/downloads/cisco-ip-phones-voip-devices-firmware-software.html)下载

然后准备对应设备MAC地址的xml配置，文件名一般是类似`SPA000000000000.cnf.xml`

我的xml示例：

```xml
<?xml version="1.0" encoding="utf-8"?>
<device>
  <fullConfig>true</fullConfig>
  <deviceProtocol>SIP</deviceProtocol>
  <devicePool>
    <dateTimeSetting>
      <!-- 日期显示格式 -->
      <dateTemplate>D/M/Y</dateTemplate>
      <!-- 时区 -->
      <timeZone>China Standard/Daylight Time</timeZone>
    </dateTimeSetting>
    <callManagerGroup>
      <members>
        <member priority="0">
          <callManager>
            <!-- 服务器端口配置 -->
            <ports>
              <ethernetPhonePort>2000</ethernetPhonePort>
              <!-- SIP服务器监听端口 -->
              <sipPort>5060</sipPort>
              <!-- 安全SIP端口 -->
              <securedSipPort>5061</securedSipPort>
            </ports>
            <!-- FreePBX地址 -->
            <processNodeName>192.168.2.10</processNodeName>
          </callManager>
        </member>
      </members>
    </callManagerGroup>
  </devicePool>
  <sipProfile>
    <sipProxies>
      <registerWithProxy>true</registerWithProxy>
    </sipProxies>
    <sipCallFeatures>
      <callHoldRingback>1</callHoldRingback>
      <semiAttendedTransfer>true</semiAttendedTransfer>
      <anonymousCallBlock>0</anonymousCallBlock>
      <callerIdBlocking>0</callerIdBlocking>
      <remoteCcEnable>true</remoteCcEnable>
      <rfc2543Hold>false</rfc2543Hold>
    </sipCallFeatures>
    <sipStack>
      <sipInviteRetx>6</sipInviteRetx>
      <sipRetx>10</sipRetx>
      <timerInviteExpires>180</timerInviteExpires>
      <!-- 注册有效期 -->
      <timerRegisterExpires>3600</timerRegisterExpires>
      <timerRegisterDelta>5</timerRegisterDelta>
      <timerKeepAliveExpires>120</timerKeepAliveExpires>
      <timerSubscribeExpires>120</timerSubscribeExpires>
      <timerSubscribeDelta>5</timerSubscribeDelta>
      <timerT1>500</timerT1>
      <timerT2>4000</timerT2>
      <maxRedirects>70</maxRedirects>
      <remotePartyID>true</remotePartyID>
      <userInfo>None</userInfo>
    </sipStack>
    <autoAnswerTimer>1</autoAnswerTimer>
    <autoAnswerAltBehavior>false</autoAnswerAltBehavior>
    <autoAnswerOverride>true</autoAnswerOverride>
    <transferOnhookEnabled>false</transferOnhookEnabled>
    <enableVad>false</enableVad>
    <!-- 首选编码 -->
    <preferredCodec>g711alaw</preferredCodec>
    <!-- DTMF负载类型，与FreePBX一致 -->
    <dtmfAvtPayload>101</dtmfAvtPayload>
    <dtmfDbLevel>3</dtmfDbLevel>
    <!-- DTMF传送方式，与FreePBX一致 -->
    <dtmfOutofBand>avt</dtmfOutofBand>
    <alwaysUsePrimeLine>false</alwaysUsePrimeLine>
    <alwaysUsePrimeLineVoiceMail>false</alwaysUsePrimeLineVoiceMail>
    <kpml>0</kpml>
    <!-- 电话显示标签 -->
    <phoneLabel>My VoIP System</phoneLabel>
    <stutterMsgWaiting>0</stutterMsgWaiting>
    <callStats>true</callStats>
    <silentPeriodBetweenCallWaitingBursts>10</silentPeriodBetweenCallWaitingBursts>
    <!-- 媒体端口起始值 -->
    <startMediaPort>16384</startMediaPort>
    <!-- 媒体端口结束值 -->
    <stopMediaPort>32766</stopMediaPort>
    <!-- NAT开关，按网络环境设置 -->
    <natEnabled>false</natEnabled>
    <!-- NAT地址，启用NAT时填写 -->
    <natAddress></natAddress>
    <!-- 线路列表，当前仅配置一条线路 -->
    <sipLines>
      <line button="1">
        <featureID>9</featureID>
        <!-- 线路标签 -->
        <featureLabel>1001</featureLabel>
        <proxy>USECALLMANAGER</proxy>
        <!-- SIP服务器端口，与上方sipPort一致 -->
        <port>5060</port>
        <!-- 分机号码 -->
        <name>1001</name>
        <!-- 显示名称 -->
        <displayName>John</displayName>
        <autoAnswer>
          <autoAnswerEnabled>0</autoAnswerEnabled>
        </autoAnswer>
        <callWaiting>1</callWaiting>
        <!-- 认证用户名 -->
        <authName>1001</authName>
        <!-- 认证密码 -->
        <authPassword>SIPPASSWORD</authPassword>
        <!-- 线路联系标识 -->
        <contact>1001</contact>
        <sharedLine>false</sharedLine>
        <messageWaitingLampPolicy>3</messageWaitingLampPolicy>
        <!-- 语音信箱功能码 -->
        <messagesNumber>*97</messagesNumber>
        <ringSettingIdle>4</ringSettingIdle>
        <ringSettingActive>5</ringSettingActive>
        <forwardCallInfoDisplay>
          <callerName>true</callerName>
          <callerNumber>true</callerNumber>
          <redirectedNumber>true</redirectedNumber>
          <dialedNumber>true</dialedNumber>
        </forwardCallInfoDisplay>
        <!-- 线路最大呼叫数 -->
        <maxNumCalls>2</maxNumCalls>
        <!-- 忙线阈值，不大于最大呼叫数 -->
        <busyTrigger>2</busyTrigger>
      </line>
    </sipLines>
    <!-- 电话侧SIP控制端口 -->
    <voipControlPort>5060</voipControlPort>
    <dscpForAudio>184</dscpForAudio>
    <ringSettingBusyStationPolicy>0</ringSettingBusyStationPolicy>
    <!-- 拨号规则文件名 -->
    <dialTemplate>dialplan.xml</dialTemplate>
  </sipProfile>
  <commonProfile>
    <!-- 电话访问密码 -->
    <phonePassword></phonePassword>
    <backgroundImageAccess>true</backgroundImageAccess>
    <callLogBlfEnabled>2</callLogBlfEnabled>
  </commonProfile>
  <!-- 固件加载标识，下面的部分可以用AI改 -->
  <loadInformation>SIP45.9-2-1S</loadInformation>
  <vendorConfig>
    <disableSpeaker>false</disableSpeaker>
    <disableSpeakerAndHeadset>false</disableSpeakerAndHeadset>
    <pcPort>0</pcPort>
    <settingsAccess>1</settingsAccess>
    <voiceVlanAccess>0</voiceVlanAccess>
    <videoCapability>0</videoCapability>
    <webAccess>0</webAccess>
    <spanToPCPort>0</spanToPCPort>
    <g722CodecSupport>1</g722CodecSupport>
  </vendorConfig>
  <!-- 配置版本标识 -->
  <versionStamp>00000000-0000-0000-0000-000000000000</versionStamp>
  <deviceSecurityMode>1</deviceSecurityMode>
  <!-- 认证服务地址 -->
  <authenticationURL></authenticationURL>
  <!-- 通讯录服务地址 -->
  <directoryURL></directoryURL>
  <!-- 电话服务地址 -->
  <servicesURL></servicesURL>
  <!-- 留言服务地址 -->
  <messagesURL></messagesURL>
  <!-- 信息页面地址 -->
  <informationURL></informationURL>
  <!-- 待机页面地址 -->
  <idleURL></idleURL>
  <!-- SIP传输协议，通常: 1-TCP 2-UDP 3-TLS 建议优先UDP-->
  <transportLayerProtocol>2</transportLayerProtocol>
</device>
```

接着创建一份dialplan.xml，我的示例：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<DIALTEMPLATE>
  <TEMPLATE MATCH="*" Timeout="4"/>
</DIALTEMPLATE>
```

准备好两个xml与固件后，将其放到一个文件夹(固件需解压缩)，开启tftp服务器(我这里Windows使用Tftpd64)，选择对应文件夹和网卡：

![](src/content/posts/about-voip/index-7.png)

![](src/content/posts/about-voip/index-5.png)

去局域网的DHCP服务器，添加Option150指向您的tftp服务器：

![](src/content/posts/about-voip/index-6.png)

确保设置正确，接下来重置话机

将设备电源拔出，按住`#`并插上电源，等待两个线路灯循环闪烁琥珀色，依次按下`123456789*0#`，设备启动后将自动下载固件与配置

这里我的第二台无论如何都无法重置，进入 Settings-->Security Configuration-->Trust List-->ITL File-->`**#`-->more-->erase，等待重启后也会拉取固件和配置文件，但这并非完全重置，我并不了解此操作的原理，出处在[how can i Cisco 7945 ip phone Factory Reset By NHSS Global](https://www.youtube.com/watch?v=og-kxt4Wii0)


## 7841

此设备的操作流程与上一台几乎一致，这里固件要去[Cisco Software Download](https://software.cisco.com/download/home)搜索7800系列下载

我的xml示例：

```xml
<?xml version="1.0" encoding="utf-8"?>
<device>
  <fullConfig>true</fullConfig>
  <deviceProtocol>SIP</deviceProtocol>
  <ipAddressMode>0</ipAddressMode>
  <devicePool>
    <dateTimeSetting>
      <!-- 日期显示格式 -->
      <dateTemplate>D/M/Y</dateTemplate>
      <!-- 时区 -->
      <timeZone>China Standard/Daylight Time</timeZone>
    </dateTimeSetting>
    <callManagerGroup>
      <members>
        <member priority="0">
          <callManager>
            <!-- 服务器端口配置 -->
            <ports>
              <ethernetPhonePort>2000</ethernetPhonePort>
              <!-- SIP服务器监听端口 -->
              <sipPort>5060</sipPort>
              <!-- 安全SIP端口 -->
              <securedSipPort>5061</securedSipPort>
            </ports>
            <!-- FreePBX地址 -->
            <processNodeName>192.168.2.10</processNodeName>
          </callManager>
        </member>
      </members>
    </callManagerGroup>
  </devicePool>
  <sipProfile>
    <sipProxies>
      <registerWithProxy>true</registerWithProxy>
    </sipProxies>
    <sipCallFeatures>
      <callHoldRingback>1</callHoldRingback>
      <semiAttendedTransfer>true</semiAttendedTransfer>
      <anonymousCallBlock>0</anonymousCallBlock>
      <callerIdBlocking>0</callerIdBlocking>
      <remoteCcEnable>true</remoteCcEnable>
      <rfc2543Hold>false</rfc2543Hold>
    </sipCallFeatures>
    <sipStack>
      <sipInviteRetx>6</sipInviteRetx>
      <sipRetx>10</sipRetx>
      <timerInviteExpires>180</timerInviteExpires>
      <!-- 注册有效期 -->
      <timerRegisterExpires>3600</timerRegisterExpires>
      <timerRegisterDelta>5</timerRegisterDelta>
      <timerKeepAliveExpires>120</timerKeepAliveExpires>
      <timerSubscribeExpires>120</timerSubscribeExpires>
      <timerSubscribeDelta>5</timerSubscribeDelta>
      <timerT1>500</timerT1>
      <timerT2>4000</timerT2>
      <maxRedirects>70</maxRedirects>
      <remotePartyID>true</remotePartyID>
      <userInfo>None</userInfo>
    </sipStack>
    <autoAnswerTimer>1</autoAnswerTimer>
    <autoAnswerAltBehavior>false</autoAnswerAltBehavior>
    <autoAnswerOverride>true</autoAnswerOverride>
    <transferOnhookEnabled>false</transferOnhookEnabled>
    <enableVad>false</enableVad>
    <!-- 首选编码 -->
    <preferredCodec>g711alaw</preferredCodec>
    <!-- DTMF负载类型，与FreePBX一致 -->
    <dtmfAvtPayload>101</dtmfAvtPayload>
    <dtmfDbLevel>3</dtmfDbLevel>
    <!-- DTMF传送方式，与FreePBX一致 -->
    <dtmfOutofBand>avt</dtmfOutofBand>
    <alwaysUsePrimeLine>false</alwaysUsePrimeLine>
    <alwaysUsePrimeLineVoiceMail>false</alwaysUsePrimeLineVoiceMail>
    <kpml>0</kpml>
    <!-- 电话显示标签 -->
    <phoneLabel>My VoIP System</phoneLabel>
    <stutterMsgWaiting>0</stutterMsgWaiting>
    <callStats>true</callStats>
    <silentPeriodBetweenCallWaitingBursts>10</silentPeriodBetweenCallWaitingBursts>
    <!-- 媒体端口起始值 -->
    <startMediaPort>16384</startMediaPort>
    <!-- 媒体端口结束值 -->
    <stopMediaPort>32766</stopMediaPort>
    <!-- NAT开关，按网络环境设置 -->
    <natEnabled>false</natEnabled>
    <!-- NAT地址，启用NAT时填写 -->
    <natAddress></natAddress>
    <!-- 线路列表，当前仅配置一条线路 -->
    <sipLines>
      <line button="1" lineIndex="1">
        <featureID>9</featureID>
        <!-- 线路标签 -->
        <featureLabel>1001</featureLabel>
        <proxy>USECALLMANAGER</proxy>
        <!-- SIP服务器端口，与上方sipPort一致 -->
        <port>5060</port>
        <!-- 分机号码 -->
        <name>1001</name>
        <!-- 显示名称 -->
        <displayName>John</displayName>
        <autoAnswer>
          <autoAnswerEnabled>0</autoAnswerEnabled>
        </autoAnswer>
        <callWaiting>1</callWaiting>
        <!-- 认证用户名 -->
        <authName>1001</authName>
        <!-- 认证密码 -->
        <authPassword>SIPPASSWORD</authPassword>
        <!-- 线路联系标识 -->
        <contact>1001</contact>
        <sharedLine>false</sharedLine>
        <messageWaitingLampPolicy>3</messageWaitingLampPolicy>
        <!-- 语音信箱功能码 -->
        <messagesNumber>*97</messagesNumber>
        <ringSettingIdle>4</ringSettingIdle>
        <ringSettingActive>5</ringSettingActive>
        <forwardCallInfoDisplay>
          <callerName>true</callerName>
          <callerNumber>true</callerNumber>
          <redirectedNumber>true</redirectedNumber>
          <dialedNumber>true</dialedNumber>
        </forwardCallInfoDisplay>
        <!-- 线路最大呼叫数 -->
        <maxNumCalls>2</maxNumCalls>
        <!-- 忙线阈值，不大于最大呼叫数 -->
        <busyTrigger>2</busyTrigger>
      </line>
    </sipLines>
    <!-- 电话侧SIP控制端口 -->
    <voipControlPort>5060</voipControlPort>
    <dscpForAudio>184</dscpForAudio>
    <ringSettingBusyStationPolicy>0</ringSettingBusyStationPolicy>
    <!-- 拨号规则文件名 -->
    <dialTemplate>dialplan.xml</dialTemplate>
  </sipProfile>
  <commonProfile>
    <!-- 电话访问密码 -->
    <phonePassword></phonePassword>
    <backgroundImageAccess>true</backgroundImageAccess>
    <callLogBlfEnabled>0</callLogBlfEnabled>
  </commonProfile>
  <!-- 固件加载标识，下面的部分可以用AI改 -->
  <loadInformation>sip78xx.14-4-1-0301-6</loadInformation>
  <vendorConfig>
    <disableSpeaker>false</disableSpeaker>
    <disableSpeakerAndHeadset>false</disableSpeakerAndHeadset>
    <pcPort>0</pcPort>
    <settingsAccess>1</settingsAccess>
    <voiceVlanAccess>0</voiceVlanAccess>
    <videoCapability>0</videoCapability>
    <webAccess>0</webAccess>
    <spanToPCPort>0</spanToPCPort>
    <g722CodecSupport>1</g722CodecSupport>
  </vendorConfig>
  <!-- 配置版本标识 -->
  <versionStamp>00000000-0000-0000-0000-000000000000</versionStamp>
  <deviceSecurityMode>1</deviceSecurityMode>
  <!-- 认证服务地址 -->
  <authenticationURL></authenticationURL>
  <!-- 通讯录服务地址 -->
  <directoryURL></directoryURL>
  <!-- 电话服务地址 -->
  <servicesURL></servicesURL>
  <!-- 留言服务地址 -->
  <messagesURL></messagesURL>
  <!-- 信息页面地址 -->
  <informationURL></informationURL>
  <!-- 待机页面地址 -->
  <idleURL></idleURL>
  <!-- SIP传输协议，通常: 1-TCP 2-UDP 3-TLS 建议优先UDP-->
  <transportLayerProtocol>2</transportLayerProtocol>
</device>
```

dialplan.xml与上方完全一致



