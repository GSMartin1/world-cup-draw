import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all teams for a specific room
export const get = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("teams")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

export const getAll = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db.query("teams")
      .filter(q => q.eq(q.field("roomId"), args.roomId))
      .collect();
  },
});

// Get only drawn teams for the CSV export (isolated to the room)
export const getDrawnTeams = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("teams")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("isDrawn"), true))
      .collect();
  },
});

// Bulk add participants from CSV upload to a specific room
export const addParticipants = mutation({
  args: { roomId: v.id("rooms"), names: v.array(v.string()) },
  handler: async (ctx, args) => {
    // Clear existing participants for THIS room first to prevent duplicates
    const existing = await ctx.db
      .query("participants")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .collect();
    
    for (const p of existing) {
      await ctx.db.delete(p._id);
    }
    
    // Insert new list with the roomId
    for (const name of args.names) {
      await ctx.db.insert("participants", { name, hasTeam: false, roomId: args.roomId });
    }
  },
});

// The fully automated Double Draw logic
export const drawTeam = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    // Get available teams ONLY in this room
    const availableTeams = await ctx.db
      .query("teams")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("isDrawn"), false))
      .collect();
      
    if (availableTeams.length === 0) throw new Error("No teams left!");

    // Get available participants ONLY in this room
    const availableParticipants = await ctx.db
      .query("participants")
      .filter((q) => q.and(
        q.eq(q.field("roomId"), args.roomId),
        q.neq(q.field("hasTeam"), true)
      ))
      .collect();
      
    if (availableParticipants.length === 0) throw new Error("No participants left in the pool!");

    // The Double Randomizer
    const randomTeamIndex = Math.floor(Math.random() * availableTeams.length);
    const selectedTeam = availableTeams[randomTeamIndex];

    const randomParticipantIndex = Math.floor(Math.random() * availableParticipants.length);
    const selectedParticipant = availableParticipants[randomParticipantIndex];

    // Lock them in
    await ctx.db.patch(selectedTeam._id, {
      isDrawn: true,
      assignedTo: selectedParticipant.name,
    });

    await ctx.db.patch(selectedParticipant._id, {
      hasTeam: true,
    });

    return { ...selectedTeam, assignedTo: selectedParticipant.name };
  },
});

// Reset the entire draw for a specific room
export const resetDraw = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const drawnTeams = await ctx.db
      .query("teams")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("isDrawn"), true))
      .collect();
      
    for (const team of drawnTeams) {
      await ctx.db.patch(team._id, { isDrawn: false, assignedTo: undefined, isEliminated: false });
    }

    const drawnParticipants = await ctx.db
      .query("participants")
      .filter((q) => q.and(
        q.eq(q.field("roomId"), args.roomId),
        q.eq(q.field("hasTeam"), true)
      ))
      .collect();
      
    for (const person of drawnParticipants) {
      await ctx.db.patch(person._id, { hasTeam: false });
    }
  },
});

// Toggle elimination status (teamId is globally unique, so roomId isn't strictly needed here)
export const toggleEliminated = mutation({
  args: { teamId: v.id("teams"), isEliminated: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.teamId, { isEliminated: args.isEliminated });
  },
});

export const setTeamStatus = mutation({
  args: { teamId: v.id("teams"), status: v.string() },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");

    // 1. If assigning a specific placement, clear it from any OTHER team in this room
    if (['1st', '2nd', '3rd', 'wooden_spoon'].includes(args.status)) {
       const allTeamsInRoom = await ctx.db.query("teams")
         .filter(q => q.eq(q.field("roomId"), team.roomId))
         .collect();
       
       const existing = allTeamsInRoom.find(t => t.placement === args.status);
       
       if (existing) {
         await ctx.db.patch(existing._id, { placement: undefined });
       }
    }

    // 2. Apply the new status
    if (args.status === "active") {
      await ctx.db.patch(args.teamId, { isEliminated: false, placement: undefined });
    } else if (args.status === "eliminated") {
      await ctx.db.patch(args.teamId, { isEliminated: true, placement: undefined });
    } else {
      await ctx.db.patch(args.teamId, { isEliminated: false, placement: args.status });
    }
  },
});

export const clearParticipants = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    // 1. Fetch participants specifically for this room
    const participants = await ctx.db.query("participants")
      .filter(q => q.eq(q.field("roomId"), args.roomId))
      .collect();
    
    console.log(`Deleting ${participants.length} participants...`);

    // 2. Delete them one by one
    for (const p of participants) {
      await ctx.db.delete(p._id);
    }

    // 3. Reset all teams in the room to "Available"
    const teams = await ctx.db.query("teams")
      .filter(q => q.eq(q.field("roomId"), args.roomId))
      .collect();

    for (const team of teams) {
      await ctx.db.patch(team._id, {
        isDrawn: false,
        assignedTo: undefined,
        isEliminated: false,
        placement: undefined
      });
    }
    
    return { success: true, deletedCount: participants.length };
  },
});