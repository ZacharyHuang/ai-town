import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { insertInput } from './aiTown/insertInput';
import { conversationId, playerId } from './aiTown/ids';

export const listMessages = query({
  args: {
    worldId: v.id('worlds'),
    conversationId,
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('messages')
      .withIndex('conversationId', (q) =>
        q.eq('worldId', args.worldId).eq('conversationId', args.conversationId),
      )
      .collect();
    const out = [];
    for (const message of messages) {
      const playerDescription = await ctx.db
        .query('playerDescriptions')
        .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('playerId', message.author))
        .first();
      if (!playerDescription) {
        throw new Error(`Invalid author ID: ${message.author}`);
      }
      out.push({ ...message, authorName: playerDescription.name });
    }
    return out;
  },
});

export const writeMessage = mutation({
  args: {
    worldId: v.id('worlds'),
    conversationId,
    messageUuid: v.string(),
    playerId,
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      author: args.playerId,
      messageUuid: args.messageUuid,
      text: args.text,
      worldId: args.worldId,
    });
    await insertInput(ctx, args.worldId, 'finishSendingMessage', {
      conversationId: args.conversationId,
      playerId: args.playerId,
      timestamp: Date.now(),
    });
  },
});

// 导出相关的query函数

// 获取所有玩家描述
export const getAllPlayerDescriptions = query({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
  },
});

// 获取所有消息(不限制数量，用于完整导出)
export const getAllMessages = query({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('messages')
      .filter((q) => q.eq(q.field('worldId'), args.worldId))
      .collect();
  },
});

// 获取所有memories(不限制数量，用于完整导出)
export const getAllMemories = query({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    // 首先获取该世界的所有玩家描述
    const playerDescriptions = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();

    // 然后获取这些玩家的所有memories
    const allMemories = [];
    for (const playerDesc of playerDescriptions) {
      const playerMemories = await ctx.db
        .query('memories')
        .withIndex('playerId', (q) => q.eq('playerId', playerDesc.playerId))
        .collect();
      allMemories.push(...playerMemories);
    }

    return allMemories;
  },
});
