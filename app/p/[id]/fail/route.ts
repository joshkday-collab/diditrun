import { handlePing } from "@/lib/ping";

async function fail(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  return handlePing({ id, request, status: "fail" });
}

export const GET = fail;
export const POST = fail;
