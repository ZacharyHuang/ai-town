import { action } from './_generated/server';
import { api } from './_generated/api';
import { v } from 'convex/values';

// 导出指定表的数据
export const exportSpecificTables: any = action({
  args: {
    worldId: v.id('worlds'),
    tables: v.array(v.string()), // ['playerDescriptions', 'memories', 'messages']
  },
  handler: async (ctx, args) => {
    console.log(`开始导出 ${args.worldId} 的指定表数据: ${args.tables.join(', ')}，格式: json`);

    try {
      const exportData: any = {
        metadata: {
          worldId: args.worldId,
          exportedAt: new Date().toISOString(),
          format: 'json',
          tables: args.tables,
          counts: {},
        },
      };

      // 根据请求的表来获取数据
      if (args.tables.includes('playerDescriptions')) {
        const playerDescriptions = await ctx.runQuery(api.messages.getAllPlayerDescriptions, {
          worldId: args.worldId,
        });
        exportData.playerDescriptions = playerDescriptions;
        exportData.metadata.counts.playerDescriptions = playerDescriptions.length;
      }

      if (args.tables.includes('memories')) {
        const memories = await ctx.runQuery(api.messages.getAllMemories, { worldId: args.worldId });
        exportData.memories = memories;
        exportData.metadata.counts.memories = memories.length;
      }

      if (args.tables.includes('messages')) {
        const messages = await ctx.runQuery(api.messages.getAllMessages, { worldId: args.worldId });

        // 增强消息数据，添加作者名称（如果也请求了playerDescriptions）
        if (args.tables.includes('playerDescriptions') && exportData.playerDescriptions) {
          const enhancedMessages = messages.map((message: any) => {
            const author = exportData.playerDescriptions.find(
              (p: any) => p.playerId === message.author,
            );
            return {
              ...message,
              authorName: author?.name || 'Unknown',
              createdAt: new Date(message._creationTime).toISOString(),
            };
          });
          exportData.messages = enhancedMessages;
        } else {
          exportData.messages = messages.map((message: any) => ({
            ...message,
            createdAt: new Date(message._creationTime).toISOString(),
          }));
        }
        exportData.metadata.counts.messages = messages.length;
      }

      return {
        success: true,
        data: exportData,
        filename: `ai-town-specific-export-${args.worldId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`,
      };
    } catch (error) {
      console.error('导出指定表数据时出错:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
