  我需要你开发一个 headscale-ui，为了可以完整覆盖 headscale 的所有操作
 
  前端技术栈：vue@latest+shadcn-vue+axios+biomejs+vite+vtest+vue-router+bunjs+bun package manger
 
  基本要求：
 
  - 完整覆盖 headscale 的所有操作
  - 使用shadcn-vue作为ui框架
  - 页面需要支持dark+ligth-auto
  - 所有操作需要100%的E2E测试
 
  请你启动agent teams 调研 tailscale+headscale 的使用用例，确保完整覆盖 headscale 的所有操作，同时如果你需要测试，请你设计一份E2E测试保存在
  `e2e` 文件夹中，如果需要启动headscale测试，请你在docker中启动一次性容器来测试。如果网络有问题，请使用 `HTTP_PROXY=http://127.0.0.1:1050` `HTTPS_PROXY=http://127.0.0.1:1050` `export ALL_PROXY=socks5://127.0.0.1:1050`

