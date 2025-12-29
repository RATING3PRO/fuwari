---
tags:
  - Tor
  - Socks5
  - 代理
title: 在内网使用Windows开放TorBrowser Socks5代理服务
published: 2025-10-30
description: 将Tor Socks5代理端口向内网开放
image: ./index.png
category: Tor
draft: false
---
# 获取Tor浏览器

常规方法可直接访问[Tor浏览器官网](https://www.torproject.org/download/)下载。但可能无法直接连接，我们可以向 gettor@torproject.org 发送邮件，主题和内容均为Help，按照回信回复系统类型，最后会发送包含验证GPG签名的安装包附件。请勿相信其他第三方源提供的安装包。

![](src/content/posts/torsocks5/index-1.png)
# 安装并启动Tor浏览器

按照安装包提示安装。前往 设置-连接界面配置网桥

![](src/content/posts/torsocks5/index-2.png)

如果你在中国大陆，请优先向[@GetBridgesBot](https://t.me/@GetBridgesBot)请求IPv6 Webtunnel网桥，这可以保证连通性。

接下来尝试连接，成功后会出现浏览器主页：

![](src/content/posts/torsocks5/index-3.png)

# 开放向内网网段所有源IP地址的Tor Socks5服务

关闭浏览器，打开安装目录：\Tor Browser\Browser\TorBrowser\Data\Tor 找到torrc文件，使用文本编辑器打开，在UseBridges 1的上方一行写入，将192.168.1.0替换为自己网络网段

``` bash
SocksPort 192.168.1.0:9060
```

![](src/content/posts/torsocks5/index-4.png)

再启动Tor浏览器，会自动向所有IP开放127.0.0.1:9060，我们还需要设置Windows防火墙开放9060端口：

打开高级安全Windows Defender防火墙，新建入站规则：

![](src/content/posts/torsocks5/index-5.png)

| 选项                     | 目标值         |
| ---------------------- | ----------- |
| 要创建的规则类型               | 端口          |
| 此规则应用于 TCP还是 UDP?      | TCP         |
| 此规则应用于所有本地端口还是特定的本地端口? | 特定本地端口：9060 |
| 连接符合指定条件时应该进行什么操作?     | 允许连接        |
| 何时应用该规则?               | 全选          |
| 名称                     | 任意          |

这时可以尝试使用其他设备连接该设备的IP地址:9060尝试访问Tor网络，可以在客户端设备打开[https://check.torproject.org/api/ip](https://check.torproject.org/api/ip) 查看回应的IsTor，应为true。

# 注意事项

本文操作会将所有可访问内网的源IP都运行不经过鉴权访问该服务，请注意是否符合当地法律和安全性问题，如需鉴权，可尝试3proxy程序。