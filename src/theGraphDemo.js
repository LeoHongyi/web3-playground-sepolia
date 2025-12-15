/**
 * 任务6: The Graph 链上数据读取 Demo
 *
 * The Graph 是什么?
 * ==================
 * The Graph 是一个去中心化的索引协议，用于查询区块链数据。
 * 它解决了直接从区块链读取复杂数据效率低下的问题。
 *
 * 核心概念:
 * - Subgraph: 定义了要索引哪些数据以及如何存储
 * - GraphQL: 使用 GraphQL 查询语言来请求数据
 * - Indexer: 运行节点来索引和处理数据
 *
 * 为什么使用 The Graph?
 * - 直接从区块链查询复杂数据很慢且困难
 * - The Graph 预先索引数据，查询速度快
 * - 支持复杂的过滤、排序、分页
 * - 去中心化，数据可信
 *
 * 本 Demo 演示如何查询公开的 Subgraph
 */

const fetch = require('cross-fetch');
require('dotenv').config();

/**
 * The Graph 端点说明:
 *
 * 托管服务 (Hosted Service) 已于 2024 年关闭
 * 现在需要使用去中心化网络 (Decentralized Network)
 *
 * 免费使用方法:
 * 1. 访问 https://thegraph.com/studio/
 * 2. 用钱包登录
 * 3. 创建 API Key (有免费额度)
 * 4. 使用格式: https://gateway.thegraph.com/api/[API-KEY]/subgraphs/id/[SUBGRAPH-ID]
 *
 * 常用 Subgraph ID:
 * - Uniswap V3 Ethereum: 5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV
 * - ENS: 5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH
 * - Aave V3 Ethereum: GQFbb95cE6d8mV989mL5figjaGaKCQB3xqYrr1bRyXqF
 */

// 使用环境变量中的 API Key，或提示用户配置
const GRAPH_API_KEY = process.env.GRAPH_API_KEY || '';

// Uniswap V3 Subgraph ID
const UNISWAP_V3_SUBGRAPH_ID = '5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV';

// 构建端点 URL
const getEndpoint = (subgraphId) => {
    if (!GRAPH_API_KEY) {
        return null;
    }
    return `https://gateway.thegraph.com/api/${GRAPH_API_KEY}/subgraphs/id/${subgraphId}`;
};

const UNISWAP_V3_ENDPOINT = getEndpoint(UNISWAP_V3_SUBGRAPH_ID);

/**
 * 执行 GraphQL 查询
 */
async function querySubgraph(endpoint, query, variables = {}) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query,
            variables
        })
    });

    const result = await response.json();

    if (result.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
}

/**
 * Demo 1: 查询 Uniswap V3 工厂信息
 */
async function queryUniswapFactory() {
    console.log('\n=== Demo 1: Uniswap V3 工厂信息 ===\n');

    const query = `
        query {
            factories(first: 1) {
                id
                poolCount
                txCount
                totalVolumeUSD
                totalValueLockedUSD
            }
        }
    `;

    try {
        const data = await querySubgraph(UNISWAP_V3_ENDPOINT, query);
        const factory = data.factories[0];

        console.log('Uniswap V3 统计:');
        console.log(`  - 合约地址: ${factory.id}`);
        console.log(`  - 交易池数量: ${factory.poolCount}`);
        console.log(`  - 总交易次数: ${parseInt(factory.txCount).toLocaleString()}`);
        console.log(`  - 总交易量: $${parseFloat(factory.totalVolumeUSD).toLocaleString(undefined, {maximumFractionDigits: 0})}`);
        console.log(`  - 总锁仓价值: $${parseFloat(factory.totalValueLockedUSD).toLocaleString(undefined, {maximumFractionDigits: 0})}`);
    } catch (error) {
        console.log('查询失败 (可能需要使用去中心化网络):', error.message);
    }
}

/**
 * Demo 2: 查询热门交易池
 */
async function queryTopPools() {
    console.log('\n=== Demo 2: Uniswap V3 热门交易池 ===\n');

    const query = `
        query {
            pools(
                first: 5
                orderBy: totalValueLockedUSD
                orderDirection: desc
            ) {
                id
                token0 {
                    symbol
                    name
                }
                token1 {
                    symbol
                    name
                }
                feeTier
                totalValueLockedUSD
                volumeUSD
            }
        }
    `;

    try {
        const data = await querySubgraph(UNISWAP_V3_ENDPOINT, query);

        console.log('TVL 排名前 5 的交易池:\n');
        data.pools.forEach((pool, index) => {
            console.log(`${index + 1}. ${pool.token0.symbol}/${pool.token1.symbol}`);
            console.log(`   手续费率: ${pool.feeTier / 10000}%`);
            console.log(`   TVL: $${parseFloat(pool.totalValueLockedUSD).toLocaleString(undefined, {maximumFractionDigits: 0})}`);
            console.log(`   交易量: $${parseFloat(pool.volumeUSD).toLocaleString(undefined, {maximumFractionDigits: 0})}`);
            console.log('');
        });
    } catch (error) {
        console.log('查询失败:', error.message);
    }
}

/**
 * Demo 3: 查询代币信息
 */
async function queryTokenInfo(symbol = 'WETH') {
    console.log(`\n=== Demo 3: 代币信息查询 (${symbol}) ===\n`);

    const query = `
        query($symbol: String!) {
            tokens(
                where: { symbol: $symbol }
                first: 1
            ) {
                id
                symbol
                name
                decimals
                totalSupply
                volumeUSD
                totalValueLockedUSD
                txCount
            }
        }
    `;

    try {
        const data = await querySubgraph(UNISWAP_V3_ENDPOINT, query, { symbol });

        if (data.tokens.length === 0) {
            console.log(`未找到代币: ${symbol}`);
            return;
        }

        const token = data.tokens[0];
        console.log(`代币: ${token.name} (${token.symbol})`);
        console.log(`  - 合约地址: ${token.id}`);
        console.log(`  - 精度: ${token.decimals}`);
        console.log(`  - 总交易次数: ${parseInt(token.txCount).toLocaleString()}`);
        console.log(`  - 总交易量: $${parseFloat(token.volumeUSD).toLocaleString(undefined, {maximumFractionDigits: 0})}`);
        console.log(`  - TVL: $${parseFloat(token.totalValueLockedUSD).toLocaleString(undefined, {maximumFractionDigits: 0})}`);
    } catch (error) {
        console.log('查询失败:', error.message);
    }
}

/**
 * Demo 4: 查询最近的交易 (Swaps)
 */
async function queryRecentSwaps() {
    console.log('\n=== Demo 4: 最近的交易记录 ===\n');

    const query = `
        query {
            swaps(
                first: 5
                orderBy: timestamp
                orderDirection: desc
            ) {
                id
                timestamp
                pool {
                    token0 {
                        symbol
                    }
                    token1 {
                        symbol
                    }
                }
                amount0
                amount1
                amountUSD
                sender
            }
        }
    `;

    try {
        const data = await querySubgraph(UNISWAP_V3_ENDPOINT, query);

        console.log('最近 5 笔 Swap 交易:\n');
        data.swaps.forEach((swap, index) => {
            const time = new Date(parseInt(swap.timestamp) * 1000).toLocaleString();
            console.log(`${index + 1}. ${time}`);
            console.log(`   交易对: ${swap.pool.token0.symbol}/${swap.pool.token1.symbol}`);
            console.log(`   数量: ${parseFloat(swap.amount0).toFixed(4)} / ${parseFloat(swap.amount1).toFixed(4)}`);
            console.log(`   价值: $${parseFloat(swap.amountUSD).toFixed(2)}`);
            console.log(`   发送者: ${swap.sender.slice(0, 10)}...`);
            console.log('');
        });
    } catch (error) {
        console.log('查询失败:', error.message);
    }
}

/**
 * Demo 5: 使用变量和分页
 */
async function queryWithPagination(skip = 0, limit = 3) {
    console.log(`\n=== Demo 5: 分页查询 (跳过 ${skip}, 获取 ${limit} 条) ===\n`);

    const query = `
        query($skip: Int!, $first: Int!) {
            pools(
                skip: $skip
                first: $first
                orderBy: createdAtTimestamp
                orderDirection: desc
            ) {
                id
                createdAtTimestamp
                token0 {
                    symbol
                }
                token1 {
                    symbol
                }
                totalValueLockedUSD
            }
        }
    `;

    try {
        const data = await querySubgraph(UNISWAP_V3_ENDPOINT, query, { skip, first: limit });

        console.log('查询结果:\n');
        data.pools.forEach((pool, index) => {
            const created = new Date(parseInt(pool.createdAtTimestamp) * 1000).toLocaleDateString();
            console.log(`${skip + index + 1}. ${pool.token0.symbol}/${pool.token1.symbol} (创建于 ${created})`);
            console.log(`   TVL: $${parseFloat(pool.totalValueLockedUSD).toLocaleString(undefined, {maximumFractionDigits: 0})}`);
        });
    } catch (error) {
        console.log('查询失败:', error.message);
    }
}

/**
 * 打印 The Graph 学习指南
 */
function printLearningGuide() {
    console.log(`
========================================
The Graph 学习指南
========================================

1. 什么是 The Graph?
   - 去中心化的区块链数据索引协议
   - 让查询链上数据变得简单快速
   - 使用 GraphQL 查询语言

2. 核心概念:
   - Subgraph: 定义索引规则的配置
   - Schema: 数据结构定义
   - Mapping: 数据转换逻辑
   - Indexer: 运行索引节点的参与者

3. 如何开始:
   a) 使用现有 Subgraph (本 Demo)
   b) 创建自己的 Subgraph:
      - 安装: npm install -g @graphprotocol/graph-cli
      - 初始化: graph init
      - 部署到 The Graph Studio

4. 查找 Subgraph:
   - Graph Explorer: https://thegraph.com/explorer
   - 支持的网络: Ethereum, Polygon, Arbitrum, 等

5. 免费额度:
   - The Graph Studio 提供免费查询额度
   - 申请 API Key: https://thegraph.com/studio/

6. 示例 Subgraph:
   - Uniswap: DEX 交易数据
   - ENS: 域名数据
   - Compound: 借贷数据
   - AAVE: 借贷数据

========================================
`);
}

/**
 * 演示本地模拟数据 (当没有 API Key 时)
 */
function showMockDemo() {
    console.log('\n=== 模拟查询演示 (无 API Key) ===\n');

    console.log('以下是 The Graph 查询的示例输出:\n');

    console.log('1. Uniswap V3 工厂信息:');
    console.log('   - 合约地址: 0x1F98431c8aD98523631AE4a59f267346ea31F984');
    console.log('   - 交易池数量: 15,234');
    console.log('   - 总交易量: $1,234,567,890,123');
    console.log('   - 总锁仓价值: $4,567,890,123\n');

    console.log('2. 热门交易池:');
    console.log('   #1 WETH/USDC (0.05% fee) - TVL: $456,789,012');
    console.log('   #2 WETH/USDT (0.3% fee)  - TVL: $234,567,890');
    console.log('   #3 WBTC/WETH (0.3% fee)  - TVL: $123,456,789\n');

    console.log('3. GraphQL 查询示例:');
    console.log(`
    query {
        pools(
            first: 5
            orderBy: totalValueLockedUSD
            orderDirection: desc
        ) {
            id
            token0 { symbol }
            token1 { symbol }
            feeTier
            totalValueLockedUSD
        }
    }
    `);
}

/**
 * 主函数
 */
async function main() {
    console.log('========================================');
    console.log('The Graph 链上数据读取 Demo');
    console.log('========================================');

    printLearningGuide();

    // 检查是否配置了 API Key
    if (!GRAPH_API_KEY) {
        console.log('========================================');
        console.log('注意: 未配置 GRAPH_API_KEY');
        console.log('========================================\n');
        console.log('The Graph 托管服务已关闭，需要使用去中心化网络。\n');
        console.log('获取免费 API Key 的步骤:');
        console.log('1. 访问 https://thegraph.com/studio/');
        console.log('2. 使用钱包连接并登录');
        console.log('3. 点击 "API Keys" 创建新的 API Key');
        console.log('4. 在 .env 文件中添加: GRAPH_API_KEY=你的API密钥\n');
        console.log('免费额度: 每月 100,000 次查询\n');

        // 显示模拟演示
        showMockDemo();

        console.log('\n========================================');
        console.log('配置 API Key 后重新运行以查看实际数据');
        console.log('========================================');
        return;
    }

    console.log('开始执行查询演示...\n');
    console.log('(注意: 免费 API 有速率限制)\n');

    // 执行所有演示
    await queryUniswapFactory();
    await queryTopPools();
    await queryTokenInfo('USDC');
    await queryRecentSwaps();
    await queryWithPagination(0, 3);

    console.log('\n========================================');
    console.log('Demo 完成!');
    console.log('========================================');
    console.log('\n下一步:');
    console.log('1. 访问 https://thegraph.com/explorer 探索更多 Subgraph');
    console.log('2. 在 https://thegraph.com/studio 创建自己的 Subgraph');
    console.log('3. 尝试查询其他协议的数据 (AAVE, Compound, ENS 等)');
}

// 导出函数供其他模块使用
module.exports = {
    querySubgraph,
    queryUniswapFactory,
    queryTopPools,
    queryTokenInfo,
    queryRecentSwaps
};

// 运行
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('错误:', error);
            process.exit(1);
        });
}
