# Headscale UI Production DX Design

## 目标

Headscale UI 应该像 Tailscale 管理台一样围绕真实任务组织，而不是围绕 REST endpoint 组织。默认保留极简无 header 的产品壳：左侧纵向导航显示当前服务器、语言、主题和退出；正文页面负责标题、说明、工具栏、任务入口、数据列表和空状态。

## 信息架构

- `Overview`：服务器健康、版本、机器、用户、认证密钥和待审路由概览。
- `Machines`：机器搜索、筛选、导出、添加设备、机器状态、归属、标签、地址、路由和行内操作。
- `Users`：用户任务卡、创建用户、搜索、角色筛选、导出、用户状态和关联机器数。
- `Auth keys`：认证密钥创建、状态筛选、一次性展示 key、生成 `tailscale up` 命令。
- `Routes`：子网路由与 exit route 审核，exit route 显式标记风险。
- `Access controls`：从 Settings 独立出来，使用可视化策略设计器管理 ACL、groups 和 tagOwners；底层仍保存 Headscale policy JSON，但用户不直接编辑 JSON。
- `Settings`：只放低频配置，包括服务健康、访问令牌、profile 管理和 DNS/OIDC/DERP/Taildrop 的服务端边界。

## Tailscale DX 对齐

页面节奏采用 `Page title -> subtitle -> Learn more -> toolbar -> task action -> data/empty state`。Machines 参考 Tailscale 的 Add device 下拉，拆成 `Linux server` 和 `Client device` 两种任务；Users 参考 Tailscale 的邀请与审批任务卡；Access controls 使用保存前安全检查，而不是裸 JSON textarea。

## 工程边界

- 全项目继续使用 TypeScript、Vue SFC、Bun scripts。
- E2E 继续使用 Vitest Browser，不引入 `@playwright/test`。
- i18n 继续使用 `vue-i18n`，默认英文，覆盖 `en/zh/fr/ru/es/ar`，Arabic 保持 RTL。
- REST/Mock client 继续作为唯一 API 边界，UI 层不暴露 endpoint 细节。

## 验收标准

- 授权后没有顶部 header，当前服务器始终可见。
- Machines/Users/Auth keys/Routes/Access controls 在移动端和桌面端无横向溢出。
- 策略编辑主路径不出现 JSON textarea，保存时由 UI 生成 policy payload。
- 多 profile 可保存、切换、删除；高风险操作区域始终显示当前服务器上下文。
- `bun run check` 必须通过。
