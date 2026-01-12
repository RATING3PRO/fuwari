---
tags:
  - Cloudflare
  - 对象存储
  - CDN
published: 2026-01-13
title: 将Backblaze B2对象存储经过Cloudflare CDN下载文件免出口费用
image: ./index.png
draft: false
description: 使用 Backblaze B2 作为对象存储，结合 Cloudflare CDN 与 Worker，实现低成本、高可控、支持大文件与断点续传的下载分发方案
category: Cloudflare
---

# Backblaze B2 + Cloudflare CDN 下载文件配置
## 目标

使用 Backblaze B2 作为源站存储，通过 CloudflareWorkers实现低成本、可缓存、支持大文件与断点续传的下载站。

最终访问形式：
https://dl.example.com/file.txt
---
## 架构说明

![](src/content/posts/cloudflaretob2/index.png)

---
## Backblaze B2 配置

### 1. 注册Backblaze并创建 Bucket

前往[Backblaze注册](https://www.backblaze.com/sign-up/cloud-storage)，注册后来到[B2Cloud Storage](https://secure.backblaze.com/b2_buckets.htm)创建桶：

B2 Cloud Storage → Buckets → Create a Bucket

- Bucket Name: 任意

- Bucket Type: Public

公开访问需要支付1美元（后续创建其他桶无需支付）

![](src/content/posts/cloudflaretob2/index-2.png)
### 2. 上传文件

上传任意示例文件，例如：file.txt

### 查看分配的友好URL域名

点击任意桶中文件的属性，查看友好URL，下面会写到CNAME和Worker中

![](src/content/posts/cloudflaretob2/index-1.png)
## Cloudflare DNS 配置

在Cloudflare添加 CNAME 记录：

dl.example.com（你的域名） → f004.backblazeb2.com（你的友好URL域名）启用橙云代理（必须）

![](src/content/posts/cloudflaretob2/index-3.png)

---
## Cloudflare Worker

创建一个HelloWorld示例，将下面的代码全选并覆盖默认的内容，需要更改test为自己的桶名，https://f004.backblazeb2.com 替换为获得的“友好 URL”域名：

```javascript

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const B2_ORIGIN = "https://f004.backblazeb2.com"
    const BUCKET = "test"
    const target = `${B2_ORIGIN}/file/${BUCKET}${url.pathname}`
    //cache
    return fetch(target, {
      cf: {
        cacheEverything: true,
        cacheTtl: 60 * 60 * 24 * 7
      }
    })
  }
}
```

绑定路由到刚才的CNAME域名：

例如  dl.example.com/*

![](src/content/posts/cloudflaretob2/index-4.png)

---
## 缓存验证

```bash
curl -I https://dl.example.com/file.txt
```

第一次请求应返回：
CF-Cache-Status: MISS
![](src/content/posts/cloudflaretob2/index-5.png)
第二次请求应返回：
CF-Cache-Status: HIT
![](src/content/posts/cloudflaretob2/index-6.png)

---

## Cloudflare Cache Rules兜底（可选）

Worker内部的配置优先级高于Cache Rules，此步骤非必须

域名 -> 规则 -> 概述 -> Cache Rules

![](src/content/posts/cloudflaretob2/index-7.png)


|             |                          |
| ----------- | ------------------------ |
| 如果传入请求匹配…   | 自定义筛选表达式                 |
| 当传入请求匹配时... | 主机名 等于 你的自定义域名（CNAME、路由） |
| 缓存资格        | 符合缓存条件                   |
| 边缘 TTL（添加）  | 忽略缓存控制标头，使用此 TTL     7天  |
| 浏览器 TTL（添加） | 替代源服务器，使用此 TTL     1天    |

![](src/content/posts/cloudflaretob2/index-8.png)

![](src/content/posts/cloudflaretob2/index-9.png)

## 最终你获得了什么

B2 出口流量费用：**0**

支持：
- 大文件
- HTTP Range / 断点续传
- 多线程下载

桶名 / 文件信息不暴露
