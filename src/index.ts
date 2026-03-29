import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!token || !accountId) {
  console.error(
    "Error: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID env vars are required"
  );
  process.exit(1);
}

const server = new McpServer({
  name: "cloudflare-workers",
  version: "1.0.0",
});

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}


function err(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true as const };
}


async function cfFetch(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const url = `https://api.cloudflare.com/client/v4${path}`;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);
  const data = (await res.json()) as {
    success?: boolean;
    errors?: Array<{ message: string }>;
  };

  if (!res.ok || !data.success) {
    const errorMsg =
      data.errors?.[0]?.message || `API error: ${res.statusText}`;
    throw new Error(errorMsg);
  }

  return data;
}

server.tool(
  "workers_list",
  "List all Workers scripts",
  {},
  async () => {
    try {
      const path = `/accounts/${accountId}/workers/scripts`;
      const data = await cfFetch("GET", path);
      return json(data);
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "workers_get",
  "Get Worker script details",
  {
    script_name: z.string(),
  },
  async (params) => {
    try {
      const path = `/accounts/${accountId}/workers/scripts/${params.script_name}`;
      const data = await cfFetch("GET", path);
      return json(data);
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "workers_get_settings",
  "Get Worker settings and bindings",
  {
    script_name: z.string(),
  },
  async (params) => {
    try {
      const path = `/accounts/${accountId}/workers/scripts/${params.script_name}/settings`;
      const data = await cfFetch("GET", path);
      return json(data);
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "workers_delete",
  "Delete a Worker script",
  {
    script_name: z.string(),
  },
  async (params) => {
    try {
      const path = `/accounts/${accountId}/workers/scripts/${params.script_name}`;
      const data = await cfFetch("DELETE", path);
      return json(data);
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "workers_list_routes",
  "List Worker routes for a zone",
  {
    zone_id: z.string(),
  },
  async (params) => {
    try {
      const path = `/zones/${params.zone_id}/workers/routes`;
      const data = await cfFetch("GET", path);
      return json(data);
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "workers_list_deployments",
  "List Worker script deployments",
  {
    script_name: z.string(),
  },
  async (params) => {
    try {
      const path = `/accounts/${accountId}/workers/scripts/${params.script_name}/deployments`;
      const data = await cfFetch("GET", path);
      return json(data);
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "workers_list_cron_triggers",
  "List cron triggers for a Worker",
  {
    script_name: z.string(),
  },
  async (params) => {
    try {
      const path = `/accounts/${accountId}/workers/scripts/${params.script_name}/schedules`;
      const data = await cfFetch("GET", path);
      return json(data);
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "workers_list_tails",
  "List tail consumers for a Worker",
  {
    script_name: z.string(),
  },
  async (params) => {
    try {
      const path = `/accounts/${accountId}/workers/scripts/${params.script_name}/tails`;
      const data = await cfFetch("GET", path);
      return json(data);
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "workers_get_subdomain",
  "Get workers.dev subdomain",
  {},
  async () => {
    try {
      const path = `/accounts/${accountId}/workers/subdomain`;
      const data = await cfFetch("GET", path);
      return json(data);
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "workers_status",
  "Show server config and connection info",
  {},
  async () => {
    try {
      return json({
        server: "cloudflare-workers",
        version: "1.0.0",
        accountId,
        tokenStatus: "configured",
      });
    } catch (e) {
      return err(e);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cloudflare Workers MCP server running on stdio");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
