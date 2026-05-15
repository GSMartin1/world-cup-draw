import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

// IMPORTANT: Paste your full list of 48 teams here!
const INITIAL_TEAMS = [
  
// POT 1
  { name: "USA", pot: 1, odds: 80, flag: "us" },
  { name: "Mexico", pot: 1, odds: 80, flag: "mx" },
  { name: "Canada", pot: 1, odds: 250, flag: "ca" },
  { name: "Spain", pot: 1, odds: 5, flag: "es" },
  { name: "Argentina", pot: 1, odds: 8, flag: "ar" },
  { name: "France", pot: 1, odds: 8, flag: "fr" },
  { name: "England", pot: 1, odds: 6, flag: "gb-eng" },
  { name: "Brazil", pot: 1, odds: 9, flag: "br" },
  { name: "Portugal", pot: 1, odds: 16, flag: "pt" },
  { name: "Netherlands", pot: 1, odds: 25, flag: "nl" },
  { name: "Belgium", pot: 1, odds: 50, flag: "be" },
  { name: "Germany", pot: 1, odds: 14, flag: "de" },

  // POT 2
  { name: "Croatia", pot: 2, odds: 100, flag: "hr" },
  { name: "Morocco", pot: 2, odds: 150, flag: "ma" },
  { name: "Colombia", pot: 2, odds: 250, flag: "co" },
  { name: "Uruguay", pot: 2, odds: 80, flag: "uy" },
  { name: "Switzerland", pot: 2, odds: 150, flag: "ch" },
  { name: "Japan", pot: 2, odds: 100, flag: "jp" },
  { name: "Senegal", pot: 2, odds: 150, flag: "sn" },
  { name: "Iran", pot: 2, odds: 750, flag: "ir" },
  { name: "South Korea", pot: 2, odds: 500, flag: "kr" },
  { name: "Ecuador", pot: 2, odds: 100, flag: "ec" },
  { name: "Austria", pot: 2, odds: 200, flag: "at" },
  { name: "Australia", pot: 2, odds: 500, flag: "au" },
  
  // POT 3
  { name: "Norway", pot: 3, odds: 150, flag: "no" },
  { name: "Panama", pot: 3, odds: 1500, flag: "pa" },
  { name: "Egypt", pot: 3, odds: 300, flag: "eg" },
  { name: "Algeria", pot: 3, odds: 400, flag: "dz" },
  { name: "Scotland", pot: 3, odds: 250, flag: "gb-sct" },
  { name: "Paraguay", pot: 3, odds: 250, flag: "py" },
  { name: "Tunisia", pot: 3, odds: 500, flag: "tn" },
  { name: "Ivory Coast", pot: 3, odds: 300, flag: "ci" },
  { name: "Uzbekistan", pot: 3, odds: 2000, flag: "uz" },
  { name: "Qatar", pot: 3, odds: 1000, flag: "qa" },
  { name: "Saudi Arabia", pot: 3, odds: 1000, flag: "sa" },
  { name: "South Africa", pot: 3, odds: 1000, flag: "za" },

  // POT 4
  { name: "Jordan", pot: 4, odds: 2500, flag: "jo" },
  { name: "Cape Verde", pot: 4, odds: 2000, flag: "cv" },
  { name: "Ghana", pot: 4, odds: 500, flag: "gh" },
  { name: "Curaçao", pot: 4, odds: 5000, flag: "cw" },
  { name: "Haiti", pot: 4, odds: 5000, flag: "ht" },
  { name: "New Zealand", pot: 4, odds: 1500, flag: "nz" },
  { name: "Czechia", pot: 4, odds: 250, flag: "cz" }, 
  { name: "Bosnia and Herzegovina", pot: 4, odds: 500, flag: "ba" }, 
  { name: "Turkey", pot: 4, odds: 150, flag: "tr" }, 
  { name: "Sweden", pot: 4, odds: 150, flag: "se" }, 
  { name: "Iraq", pot: 4, odds: 1500, flag: "iq" }, 
  { name: "DR Congo", pot: 4, odds: 1000, flag: "cd" } 
];

// --- QUERIES ---

// Get a specific room by its ID (used when loading the tournament view)
export const get = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roomId);
  },
});

// Find a room by its exact name (used for the "Join a Draw" search)
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
  },
});


// --- MUTATIONS ---

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const existingRoom = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (existingRoom) {
      throw new ConvexError("A tournament with this name already exists! Please choose a unique name.");
    }

    const roomId = await ctx.db.insert("rooms", { name: args.name });

    for (const team of INITIAL_TEAMS) {
      await ctx.db.insert("teams", {
        roomId,
        name: team.name,
        pot: team.pot,
        odds: team.odds,
        flag: team.flag,
        isDrawn: false,
        isEliminated: false,
      });
    }

    return roomId;
  },
});

// Get all rooms (for the Admin dashboard to resume draws)
export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("rooms").collect();
  },
});
export const deleteRoom = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    // 1. Delete all teams associated with this room
    const teams = await ctx.db.query("teams")
      .filter(q => q.eq(q.field("roomId"), args.roomId))
      .collect();
    
    for (const team of teams) {
      await ctx.db.delete(team._id);
    }
    
    // 2. Delete the room itself
    await ctx.db.delete(args.roomId);
  },
});