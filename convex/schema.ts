import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// convex/schema.ts updates
export default defineSchema({
  rooms: defineTable({
    name: v.string(),
  }),
  
  teams: defineTable({
    name: v.string(),
    pot: v.number(),
    odds: v.number(),
    flag: v.string(),
    isDrawn: v.boolean(),
    assignedTo: v.optional(v.string()),
    isEliminated: v.boolean(), 
    placement: v.optional(v.string()),
    roomId: v.id("rooms"), 
  }).index("by_room", ["roomId"]),
  
  participants: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    hasTeam: v.optional(v.boolean()), 
    roomId: v.id("rooms"),
  }).index("by_room", ["roomId"]),
});