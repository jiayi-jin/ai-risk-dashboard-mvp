#!/bin/bash
# 使用 Veee 代理启动开发服务器（端口按你在 Veee 里看到的改）
export HTTP_PROXY=http://127.0.0.1:15236
export HTTPS_PROXY=http://127.0.0.1:15236
npm run dev
