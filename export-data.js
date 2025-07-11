#!/usr/bin/env node

/**
 * 快速导出 playerDescriptions、memories 和 messages 三个表的脚本
 * 使用方法：
 * node export-data.js
 * node export-data.js --world-id "your-world-id"
 */

import { ConvexHttpClient } from 'convex/browser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: '.env.local' });

// 从环境变量或配置文件读取Convex URL
const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error('❌ 错误: 找不到 CONVEX_URL');
  console.error('请在 .env.local 文件中设置 VITE_CONVEX_URL，或者运行:');
  console.error('  export CONVEX_URL=<your-convex-url>');
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function getDefaultWorldId() {
  try {
    const worldStatus = await client.query('world:defaultWorldStatus');
    if (!worldStatus) {
      throw new Error('没有找到默认世界');
    }
    return worldStatus.worldId;
  } catch (error) {
    throw new Error(`获取默认世界ID失败: ${error.message}`);
  }
}

async function exportThreeTables(worldId) {
  const tables = ['playerDescriptions', 'memories', 'messages'];
  console.log(`🚀 开始导出世界 ${worldId} 的三个表: ${tables.join(', ')}...`);

  try {
    const result = await client.action('dataExport:exportSpecificTables', {
      worldId,
      tables,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    const filename = result.filename;
    const outputPath = path.join(process.cwd(), filename);

    fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2), 'utf8');
    console.log(`✅ 三个表的数据已导出到: ${filename}`);

    console.log(`📊 导出统计:`);
    if (result.data.metadata.counts.playerDescriptions !== undefined) {
      console.log(`   - 玩家描述数量: ${result.data.metadata.counts.playerDescriptions}`);
    }
    if (result.data.metadata.counts.memories !== undefined) {
      console.log(`   - 记忆数量: ${result.data.metadata.counts.memories}`);
    }
    if (result.data.metadata.counts.messages !== undefined) {
      console.log(`   - 消息数量: ${result.data.metadata.counts.messages}`);
    }

    console.log(`🎉 导出完成！`);
  } catch (error) {
    console.error(`❌ 导出失败: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  let worldId = null;

  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--world-id':
        worldId = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
🚀 快速导出 AI Town 三个核心表数据

用法:
  node export-data.js [选项]

选项:
  --world-id <ID>         指定世界ID (默认: 使用默认世界)
  --help                  显示此帮助信息

导出的表:
  - playerDescriptions: 玩家描述信息
  - memories: AI角色的记忆数据  
  - messages: 聊天消息数据

示例:
  node export-data.js                    # 导出JSON格式
  node export-data.js --world-id "xyz123"  # 指定世界ID
        `);
        return;
      default:
        console.error(`❌ 未知选项: ${arg}`);
        process.exit(1);
    }
  }

  try {
    // 获取世界ID
    if (!worldId) {
      worldId = await getDefaultWorldId();
      console.log(`📍 使用默认世界: ${worldId}`);
    }

    await exportThreeTables(worldId);
  } catch (error) {
    console.error(`❌ 执行失败: ${error.message}`);
    process.exit(1);
  }
}

// ES模块的入口点检查
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
