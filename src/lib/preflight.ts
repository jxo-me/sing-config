import { currentConfig } from '../stores/config';

export interface PreflightIssue {
  level: 'error' | 'warning' | 'info';
  path: string;
  message: string;
  fix?: string;
}

// 获取当前语言设置
function getCurrentLocale(): 'zh' | 'en' {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('locale');
    if (saved === 'zh' || saved === 'en') {
      return saved;
    }
  }
  // 默认根据浏览器语言判断
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('zh')) {
      return 'zh';
    }
  }
  return 'en';
}

export function checkPortConflicts(): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const inbounds = (currentConfig.value.inbounds as Array<Record<string, unknown>>) || [];
  const portMap = new Map<number, Array<{ tag: string; idx: number }>>();
  
  inbounds.forEach((inbound, idx) => {
    const port = inbound.listen_port as number;
    if (port) {
      if (!portMap.has(port)) {
        portMap.set(port, []);
      }
      portMap.get(port)!.push({ tag: (inbound.tag as string) || `inbound-${idx}`, idx });
    }
  });
  
  const locale = getCurrentLocale();
  portMap.forEach((items, port) => {
    if (items.length > 1) {
      const tags = items.map(i => i.tag).join(', ');
      issues.push({
        level: 'error',
        path: `/inbounds/${items[0].idx}/listen_port`,
        message: locale === 'zh' 
          ? `端口 ${port} 被多个入站使用: ${tags}`
          : `Port ${port} is used by multiple inbounds: ${tags}`,
        fix: locale === 'zh' 
          ? '修改其中一个入站的端口'
          : 'Change the port of one of the inbounds',
      });
    }
  });
  
  return issues;
}

export function checkTagReferences(): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const locale = getCurrentLocale();
  const config = currentConfig.value;
  const outbounds = (config.outbounds as Array<Record<string, unknown>>) || [];
  const outboundTags = new Set(outbounds.map(o => o.tag as string).filter(Boolean));
  const dnsServers = ((config.dns as Record<string, unknown>)?.servers as Array<Record<string, unknown>>) || [];
  const dnsServerTags = new Set(dnsServers.map(s => s.tag as string).filter(Boolean));
  const route = config.route as Record<string, unknown> | undefined;
  
  // 检查路由规则中的出站引用
  if (route?.rules) {
    const rules = route.rules as Array<Record<string, unknown>>;
    rules.forEach((rule, idx) => {
      const outboundTag = rule.outbound as string;
      if (outboundTag && !outboundTags.has(outboundTag)) {
        issues.push({
          level: 'error',
          path: `/route/rules/${idx}/outbound`,
          message: locale === 'zh' 
            ? `路由规则引用了不存在的出站标签: ${outboundTag}`
            : `Route rule references non-existent outbound tag: ${outboundTag}`,
          fix: locale === 'zh' 
            ? `创建标签为 "${outboundTag}" 的出站，或修改路由规则`
            : `Create an outbound with tag "${outboundTag}", or modify the route rule`,
        });
      }
    });
    
    const final = route.final as string;
    if (final && !outboundTags.has(final)) {
      issues.push({
        level: 'error',
        path: '/route/final',
        message: locale === 'zh' 
          ? `默认路由引用了不存在的出站标签: ${final}`
          : `Default route references non-existent outbound tag: ${final}`,
        fix: locale === 'zh' 
          ? `创建标签为 "${final}" 的出站，或修改默认路由`
          : `Create an outbound with tag "${final}", or modify the default route`,
      });
    }
  }
  
  // 检查 DNS 规则中的服务器引用
  if (config.dns) {
    const dnsRules = ((config.dns as Record<string, unknown>).rules as Array<Record<string, unknown>>) || [];
    dnsRules.forEach((rule, idx) => {
      const serverField = rule.server;
      // 处理 server 字段可能是数组或单个字符串的情况
      let servers: string[] = [];
      if (Array.isArray(serverField)) {
        servers = serverField.filter((s): s is string => typeof s === 'string');
      } else if (typeof serverField === 'string') {
        servers = [serverField];
      }
      
      servers.forEach((serverTag) => {
        if (serverTag && !dnsServerTags.has(serverTag)) {
          issues.push({
            level: 'error',
            path: `/dns/rules/${idx}/server`,
            message: locale === 'zh' 
              ? `DNS 规则引用了不存在的 DNS 服务器标签: ${serverTag}`
              : `DNS rule references non-existent DNS server tag: ${serverTag}`,
            fix: locale === 'zh' 
              ? `创建标签为 "${serverTag}" 的 DNS 服务器，或修改 DNS 规则`
              : `Create a DNS server with tag "${serverTag}", or modify the DNS rule`,
          });
        }
      });
    });
  }
  
  // 检查 Selector/URLTest 出站的标签引用
  outbounds.forEach((outbound, idx) => {
    if (outbound.type === 'selector' || outbound.type === 'urltest') {
      const tags = (outbound.outbounds as string[]) || [];
      tags.forEach((tag) => {
        if (!outboundTags.has(tag)) {
          issues.push({
            level: 'error',
            path: `/outbounds/${idx}/outbounds`,
            message: locale === 'zh' 
              ? `${outbound.type} 出站引用了不存在的标签: ${tag}`
              : `${outbound.type} outbound references non-existent tag: ${tag}`,
            fix: locale === 'zh' 
              ? `创建标签为 "${tag}" 的出站，或从列表中移除`
              : `Create an outbound with tag "${tag}", or remove it from the list`,
          });
        }
      });
    }
  });
  
  return issues;
}

export function checkRequiredFields(): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const locale = getCurrentLocale();
  
  // 检查出站必填字段
  const outbounds = (currentConfig.value.outbounds as Array<Record<string, unknown>>) || [];
  outbounds.forEach((outbound, idx) => {
    if (outbound.type === 'vmess' || outbound.type === 'vless') {
      if (!outbound.uuid) {
        issues.push({
          level: 'error',
          path: `/outbounds/${idx}/uuid`,
          message: locale === 'zh' 
            ? `${outbound.type} 出站缺少必填字段: uuid`
            : `${outbound.type} outbound missing required field: uuid`,
          fix: locale === 'zh' 
            ? '添加 UUID 字段'
            : 'Add UUID field',
        });
      }
    }
    if (outbound.type === 'trojan') {
      if (!outbound.password) {
        issues.push({
          level: 'error',
          path: `/outbounds/${idx}/password`,
          message: locale === 'zh' 
            ? 'Trojan 出站缺少必填字段: password'
            : 'Trojan outbound missing required field: password',
          fix: locale === 'zh' 
            ? '添加密码字段'
            : 'Add password field',
        });
      }
    }
    if (outbound.type === 'shadowsocks') {
      if (!outbound.password) {
        issues.push({
          level: 'error',
          path: `/outbounds/${idx}/password`,
          message: locale === 'zh' 
            ? 'Shadowsocks 出站缺少必填字段: password'
            : 'Shadowsocks outbound missing required field: password',
          fix: locale === 'zh' 
            ? '添加密码字段'
            : 'Add password field',
        });
      }
      if (!outbound.method) {
        issues.push({
          level: 'error',
          path: `/outbounds/${idx}/method`,
          message: locale === 'zh' 
            ? 'Shadowsocks 出站缺少必填字段: method'
            : 'Shadowsocks outbound missing required field: method',
          fix: locale === 'zh' 
            ? '选择加密方法'
            : 'Select encryption method',
        });
      }
    }
  });
  
  // 检查入站必填字段
  const inbounds = (currentConfig.value.inbounds as Array<Record<string, unknown>>) || [];
  inbounds.forEach((inbound, idx) => {
    if (inbound.type === 'vmess' || inbound.type === 'vless') {
      const users = (inbound.users as Array<Record<string, unknown>>) || [];
      if (users.length === 0) {
        issues.push({
          level: 'error',
          path: `/inbounds/${idx}/users`,
          message: locale === 'zh' 
            ? `${inbound.type} 入站需要至少一个用户`
            : `${inbound.type} inbound requires at least one user`,
          fix: locale === 'zh' 
            ? '添加至少一个用户'
            : 'Add at least one user',
        });
      }
    }
    if (inbound.type === 'trojan') {
      const users = (inbound.users as Array<Record<string, unknown>>) || [];
      if (users.length === 0) {
        issues.push({
          level: 'error',
          path: `/inbounds/${idx}/users`,
          message: locale === 'zh' 
            ? 'Trojan 入站需要至少一个用户'
            : 'Trojan inbound requires at least one user',
          fix: locale === 'zh' 
            ? '添加至少一个用户'
            : 'Add at least one user',
        });
      }
    }
  });
  
  return issues;
}

export function checkTlsConfig(): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const locale = getCurrentLocale();
  const outbounds = (currentConfig.value.outbounds as Array<Record<string, unknown>>) || [];
  
  outbounds.forEach((outbound, idx) => {
    const tls = outbound.tls as Record<string, unknown> | undefined;
    if (tls && tls.enabled && outbound.server_port === 80) {
      issues.push({
        level: 'warning',
        path: `/outbounds/${idx}/tls`,
        message: locale === 'zh' 
          ? '使用 TLS 但服务器端口为 80，建议使用 443'
          : 'TLS is enabled but server port is 80, recommend using 443',
        fix: locale === 'zh' 
          ? '将 server_port 改为 443'
          : 'Change server_port to 443',
      });
    }
  });
  
  return issues;
}

export async function runPreflightCheck(): Promise<PreflightIssue[]> {
  const issues: PreflightIssue[] = [];
  
  issues.push(...checkPortConflicts());
  issues.push(...checkTagReferences());
  issues.push(...checkRequiredFields());
  issues.push(...checkTlsConfig());
  
  return issues;
}

