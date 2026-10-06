import { handlePing } from "@/lib/ping";

async function ping(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  return handlePing({ id, request, status: "ok" });
}

export const GET = ping;
export const POST = ping;
