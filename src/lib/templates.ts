export interface ConfigTemplate {
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  category: 'outbound' | 'inbound' | 'dns' | 'route';
  config: Record<string, unknown>;
}

export const templates: ConfigTemplate[] = [
  // Outbound Templates
  {
    name: 'VMess Basic',
    nameZh: 'VMess 基础',
    description: 'Basic VMess outbound configuration',
    descriptionZh: '基础 VMess 出站配置',
    category: 'outbound',
    config: {
      type: 'vmess',
      tag: 'vmess-out',
      server: 'example.com',
      server_port: 443,
      uuid: '00000000-0000-0000-0000-000000000000',
      security: 'auto',
      alter_id: 0,
      tls: {
        enabled: true,
        server_name: 'example.com',
      },
    },
  },
  {
    name: 'VLESS with TLS',
    nameZh: 'VLESS TLS',
    description: 'VLESS outbound with TLS encryption',
    descriptionZh: '带 TLS 加密的 VLESS 出站',
    category: 'outbound',
    config: {
      type: 'vless',
      tag: 'vless-out',
      server: 'example.com',
      server_port: 443,
      uuid: '00000000-0000-0000-0000-000000000000',
      tls: {
        enabled: true,
        server_name: 'example.com',
      },
    },
  },
  {
    name: 'Trojan',
    nameZh: 'Trojan',
    description: 'Trojan outbound configuration',
    descriptionZh: 'Trojan 出站配置',
    category: 'outbound',
    config: {
      type: 'trojan',
      tag: 'trojan-out',
      server: 'example.com',
      server_port: 443,
      password: 'your-password',
      tls: {
        enabled: true,
        server_name: 'example.com',
      },
    },
  },
  {
    name: 'Shadowsocks',
    nameZh: 'Shadowsocks',
    description: 'Shadowsocks outbound configuration',
    descriptionZh: 'Shadowsocks 出站配置',
    category: 'outbound',
    config: {
      type: 'shadowsocks',
      tag: 'ss-out',
      server: 'example.com',
      server_port: 8388,
      method: '2022-blake3-aes-128-gcm',
      password: 'your-password',
    },
  },
  // Inbound Templates
  {
    name: 'SOCKS Inbound',
    nameZh: 'SOCKS 入站',
    description: 'Basic SOCKS5 inbound',
    descriptionZh: '基础 SOCKS5 入站',
    category: 'inbound',
    config: {
      type: 'socks',
      tag: 'socks-in',
      listen: '127.0.0.1',
      listen_port: 1080,
    },
  },
  {
    name: 'HTTP Inbound',
    nameZh: 'HTTP 入站',
    description: 'Basic HTTP proxy inbound',
    descriptionZh: '基础 HTTP 代理入站',
    category: 'inbound',
    config: {
      type: 'http',
      tag: 'http-in',
      listen: '127.0.0.1',
      listen_port: 8080,
    },
  },
  {
    name: 'Mixed Inbound',
    nameZh: '混合入站',
    description: 'Mixed SOCKS5 and HTTP inbound',
    descriptionZh: '混合 SOCKS5 和 HTTP 入站',
    category: 'inbound',
    config: {
      type: 'mixed',
      tag: 'mixed-in',
      listen: '127.0.0.1',
      listen_port: 7890,
    },
  },
  {
    name: 'VMess Inbound',
    nameZh: 'VMess 入站',
    description: 'VMess inbound with TLS',
    descriptionZh: '带 TLS 的 VMess 入站',
    category: 'inbound',
    config: {
      type: 'vmess',
      tag: 'vmess-in',
      listen: '0.0.0.0',
      listen_port: 443,
      users: [{
        uuid: '00000000-0000-0000-0000-000000000000',
        alterId: 0,
      }],
      tls: {
        enabled: true,
        certificate_path: './cert.pem',
        key_path: './key.pem',
      },
    },
  },
  // DNS Templates
  {
    name: 'DoH (Cloudflare)',
    nameZh: 'DoH (Cloudflare)',
    description: 'Cloudflare DNS over HTTPS',
    descriptionZh: 'Cloudflare DNS over HTTPS',
    category: 'dns',
    config: {
      servers: [
        {
          tag: 'doh-cf',
          address: 'https://cloudflare-dns.com/dns-query',
          address_resolver: 'local',
        },
      ],
      final: 'doh-cf',
    },
  },
  {
    name: 'Local DNS',
    nameZh: '本地 DNS',
    description: 'Local DNS with system resolver',
    descriptionZh: '使用系统解析器的本地 DNS',
    category: 'dns',
    config: {
      servers: [
        {
          tag: 'local',
          address: 'local',
        },
      ],
      final: 'local',
    },
  },
  // Route Templates
  {
    name: 'Direct All',
    nameZh: '全部直连',
    description: 'Route all traffic directly',
    descriptionZh: '将所有流量直连',
    category: 'route',
    config: {
      rules: [],
      final: 'direct',
    },
  },
  {
    name: 'CN Direct',
    nameZh: '中国直连',
    description: 'Direct for Chinese domains, proxy for others',
    descriptionZh: '中国域名直连，其他代理',
    category: 'route',
    config: {
      rules: [
        {
          geosite: ['cn'],
          outbound: 'direct',
        },
      ],
      final: 'proxy',
    },
  },
];

export function applyTemplate(template: ConfigTemplate, currentConfig: Record<string, unknown>) {
  const newConfig = { ...currentConfig };
  
  if (template.category === 'outbound') {
    const outbounds = (newConfig.outbounds as Array<Record<string, unknown>>) || [];
    outbounds.push(template.config);
    newConfig.outbounds = outbounds;
  } else if (template.category === 'inbound') {
    const inbounds = (newConfig.inbounds as Array<Record<string, unknown>>) || [];
    inbounds.push(template.config);
    newConfig.inbounds = inbounds;
  } else if (template.category === 'dns') {
    newConfig.dns = { ...(newConfig.dns as Record<string, unknown> || {}), ...template.config };
  } else if (template.category === 'route') {
    newConfig.route = { ...(newConfig.route as Record<string, unknown> || {}), ...template.config };
  }
  
  return newConfig;
}

