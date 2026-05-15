import { query } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db.query("participants")
      .filter(q => q.eq(q.field("roomId"), args.roomId))
      .collect();
  },
});