export type WebDavConfig = {
  url: string;
  username?: string;
  password?: string;
};

export async function testWebDavConnection(config: WebDavConfig): Promise<boolean> {
  if (!config.url) {
    return false;
  }

  // 第四阶段再实现真实 WebDAV PROPFIND / PUT / GET。
  return true;
}
