import { currentConfig } from '../stores/config';

export interface PreflightIssue {
  level: 'error' | 'warning' | 'info';
  path: string;
  message: string;
  fix?: string;
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
  
  portMap.forEach((items, port) => {
    if (items.length > 1) {
      issues.push({
        level: 'error',
        path: `/inbounds/${items[0].idx}/listen_port`,
        message: `端口 ${port} 被多个入站使用: ${items.map(i => i.tag).join(', ')}`,
        fix: '修改其中一个入站的端口',
      });
    }
  });
  
  return issues;
}

export function checkTagReferences(): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
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
          message: `路由规则引用了不存在的出站标签: ${outboundTag}`,
          fix: `创建标签为 "${outboundTag}" 的出站，或修改路由规则`,
        });
      }
    });
    
    const final = route.final as string;
    if (final && !outboundTags.has(final)) {
      issues.push({
        level: 'error',
        path: '/route/final',
        message: `默认路由引用了不存在的出站标签: ${final}`,
        fix: `创建标签为 "${final}" 的出站，或修改默认路由`,
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
            message: `DNS 规则引用了不存在的 DNS 服务器标签: ${serverTag}`,
            fix: `创建标签为 "${serverTag}" 的 DNS 服务器，或修改 DNS 规则`,
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
            message: `${outbound.type} 出站引用了不存在的标签: ${tag}`,
            fix: `创建标签为 "${tag}" 的出站，或从列表中移除`,
          });
        }
      });
    }
  });
  
  return issues;
}

export function checkRequiredFields(): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  
  // 检查出站必填字段
  const outbounds = (currentConfig.value.outbounds as Array<Record<string, unknown>>) || [];
  outbounds.forEach((outbound, idx) => {
    if (outbound.type === 'vmess' || outbound.type === 'vless') {
      if (!outbound.uuid) {
        issues.push({
          level: 'error',
          path: `/outbounds/${idx}/uuid`,
          message: `${outbound.type} 出站缺少必填字段: uuid`,
          fix: '添加 UUID 字段',
        });
      }
    }
    if (outbound.type === 'trojan') {
      if (!outbound.password) {
        issues.push({
          level: 'error',
          path: `/outbounds/${idx}/password`,
          message: 'Trojan 出站缺少必填字段: password',
          fix: '添加密码字段',
        });
      }
    }
    if (outbound.type === 'shadowsocks') {
      if (!outbound.password) {
        issues.push({
          level: 'error',
          path: `/outbounds/${idx}/password`,
          message: 'Shadowsocks 出站缺少必填字段: password',
          fix: '添加密码字段',
        });
      }
      if (!outbound.method) {
        issues.push({
          level: 'error',
          path: `/outbounds/${idx}/method`,
          message: 'Shadowsocks 出站缺少必填字段: method',
          fix: '选择加密方法',
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
          message: `${inbound.type} 入站需要至少一个用户`,
          fix: '添加至少一个用户',
        });
      }
    }
    if (inbound.type === 'trojan') {
      const users = (inbound.users as Array<Record<string, unknown>>) || [];
      if (users.length === 0) {
        issues.push({
          level: 'error',
          path: `/inbounds/${idx}/users`,
          message: 'Trojan 入站需要至少一个用户',
          fix: '添加至少一个用户',
        });
      }
    }
  });
  
  return issues;
}

export function checkTlsConfig(): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const outbounds = (currentConfig.value.outbounds as Array<Record<string, unknown>>) || [];
  
  outbounds.forEach((outbound, idx) => {
    const tls = outbound.tls as Record<string, unknown> | undefined;
    if (tls && tls.enabled && outbound.server_port === 80) {
      issues.push({
        level: 'warning',
        path: `/outbounds/${idx}/tls`,
        message: '使用 TLS 但服务器端口为 80，建议使用 443',
        fix: '将 server_port 改为 443',
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

