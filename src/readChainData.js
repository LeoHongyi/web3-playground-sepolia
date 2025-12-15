/**
 * 任务5: 通过 Ethers.js 完成链上数据的读取
 *
 * 演示如何读取:
 * 1. 区块信息
 * 2. 账户余额
 * 3. 交易详情
 * 4. 合约数据 (以 ERC20 代币为例)
 * 5. 事件日志
 */

const { ethers } = require('ethers');
require('dotenv').config();

// ERC20 标准 ABI (部分)
const ERC20_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'event Transfer(address indexed from, address indexed to, uint256 value)'
];

// Sepolia 上的一些已知合约地址
const KNOWN_CONTRACTS = {
    // Chainlink LINK Token on Sepolia
    LINK: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
    // Wrapped ETH on Sepolia
    WETH: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9'
};

async function readChainData() {
    // 连接到 Sepolia (备用 RPC 列表)
    const rpcUrls = [
        process.env.SEPOLIA_RPC_URL,
        'https://ethereum-sepolia-rpc.publicnode.com',
        'https://rpc2.sepolia.org',
        'https://sepolia.gateway.tenderly.co'
    ].filter(Boolean);

    let provider;
    for (const url of rpcUrls) {
        try {
            provider = new ethers.JsonRpcProvider(url);
            await provider.getNetwork(); // 测试连接
            console.log(`已连接到: ${url}\n`);
            break;
        } catch (e) {
            console.log(`RPC ${url} 不可用，尝试下一个...`);
        }
    }
    if (!provider) {
        throw new Error('所有 RPC 都不可用');
    }

    console.log('========================================');
    console.log('Ethers.js 链上数据读取演示');
    console.log('========================================\n');

    // ============ 1. 网络信息 ============
    console.log('=== 1. 网络信息 ===\n');

    const network = await provider.getNetwork();
    console.log(`网络名称: ${network.name}`);
    console.log(`Chain ID: ${network.chainId}`);

    const blockNumber = await provider.getBlockNumber();
    console.log(`当前区块高度: ${blockNumber}`);

    const feeData = await provider.getFeeData();
    console.log(`当前 Gas Price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} Gwei`);

    // ============ 2. 区块信息 ============
    console.log('\n=== 2. 最新区块信息 ===\n');

    const latestBlock = await provider.getBlock('latest');
    console.log(`区块号: ${latestBlock.number}`);
    console.log(`区块哈希: ${latestBlock.hash}`);
    console.log(`父区块哈希: ${latestBlock.parentHash}`);
    console.log(`时间戳: ${new Date(latestBlock.timestamp * 1000).toLocaleString()}`);
    console.log(`Gas Used: ${latestBlock.gasUsed.toString()}`);
    console.log(`Gas Limit: ${latestBlock.gasLimit.toString()}`);
    console.log(`交易数量: ${latestBlock.transactions.length}`);
    console.log(`矿工/验证者: ${latestBlock.miner}`);

    // ============ 3. 账户余额 ============
    console.log('\n=== 3. 账户余额查询 ===\n');

    // Vitalik 的地址 (在所有网络都一样)
    const vitalikAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const vitalikBalance = await provider.getBalance(vitalikAddress);
    console.log(`Vitalik 地址: ${vitalikAddress}`);
    console.log(`Sepolia 余额: ${ethers.formatEther(vitalikBalance)} ETH`);

    // 如果配置了私钥，显示自己的地址余额
    if (process.env.PRIVATE_KEY) {
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
        const myBalance = await provider.getBalance(wallet.address);
        console.log(`\n你的地址: ${wallet.address}`);
        console.log(`你的余额: ${ethers.formatEther(myBalance)} ETH`);
    }

    // ============ 4. 交易详情 ============
    console.log('\n=== 4. 交易详情查询 ===\n');

    // 获取最新区块中的第一笔交易
    if (latestBlock.transactions.length > 0) {
        const txHash = latestBlock.transactions[0];
        console.log(`查询交易: ${txHash}`);

        const tx = await provider.getTransaction(txHash);
        if (tx) {
            console.log(`  发送方: ${tx.from}`);
            console.log(`  接收方: ${tx.to || '合约创建'}`);
            console.log(`  金额: ${ethers.formatEther(tx.value)} ETH`);
            console.log(`  Gas Price: ${ethers.formatUnits(tx.gasPrice, 'gwei')} Gwei`);
            console.log(`  Gas Limit: ${tx.gasLimit.toString()}`);
            console.log(`  Nonce: ${tx.nonce}`);
            console.log(`  数据长度: ${tx.data.length} bytes`);

            // 获取交易收据
            const receipt = await provider.getTransactionReceipt(txHash);
            if (receipt) {
                console.log(`  状态: ${receipt.status === 1 ? '成功' : '失败'}`);
                console.log(`  实际 Gas 消耗: ${receipt.gasUsed.toString()}`);
                console.log(`  日志数量: ${receipt.logs.length}`);
            }
        }
    }

    // ============ 5. ERC20 代币合约读取 ============
    console.log('\n=== 5. ERC20 代币合约读取 (LINK Token) ===\n');

    try {
        const linkContract = new ethers.Contract(KNOWN_CONTRACTS.LINK, ERC20_ABI, provider);

        const [name, symbol, decimals, totalSupply] = await Promise.all([
            linkContract.name(),
            linkContract.symbol(),
            linkContract.decimals(),
            linkContract.totalSupply()
        ]);

        console.log(`代币名称: ${name}`);
        console.log(`代币符号: ${symbol}`);
        console.log(`精度: ${decimals}`);
        console.log(`总供应量: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);

        // 查询某个地址的代币余额
        const linkBalance = await linkContract.balanceOf(vitalikAddress);
        console.log(`Vitalik 的 LINK 余额: ${ethers.formatUnits(linkBalance, decimals)} ${symbol}`);
    } catch (error) {
        console.log('LINK 合约查询失败:', error.message);
    }

    // ============ 6. 事件日志读取 ============
    console.log('\n=== 6. 事件日志读取 (最近的 Transfer 事件) ===\n');

    try {
        const linkContract = new ethers.Contract(KNOWN_CONTRACTS.LINK, ERC20_ABI, provider);

        // 查询最近 100 个区块的 Transfer 事件
        const fromBlock = blockNumber - 100;
        const filter = linkContract.filters.Transfer();
        const events = await linkContract.queryFilter(filter, fromBlock, 'latest');

        console.log(`在区块 ${fromBlock} 到 ${blockNumber} 之间找到 ${events.length} 个 Transfer 事件`);

        // 显示最新的 3 个事件
        const recentEvents = events.slice(-3);
        for (const event of recentEvents) {
            console.log(`\n交易: ${event.transactionHash.slice(0, 20)}...`);
            console.log(`  从: ${event.args.from}`);
            console.log(`  到: ${event.args.to}`);
            console.log(`  数量: ${ethers.formatUnits(event.args.value, 18)} LINK`);
            console.log(`  区块: ${event.blockNumber}`);
        }
    } catch (error) {
        console.log('事件查询失败:', error.message);
    }

    // ============ 7. ENS 解析 (如果支持) ============
    console.log('\n=== 7. 地址与数据解析 ===\n');

    // 解析交易输入数据示例
    const sampleTxData = '0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa9604500000000000000000000000000000000000000000000000000000000000003e8';
    console.log('示例交易数据解析:');
    console.log(`原始数据: ${sampleTxData.slice(0, 50)}...`);

    // 使用 Interface 解析
    const iface = new ethers.Interface(ERC20_ABI);
    try {
        const decoded = iface.parseTransaction({ data: sampleTxData });
        console.log(`函数名: ${decoded.name}`);
        console.log(`参数:`);
        console.log(`  - to: ${decoded.args[0]}`);
        console.log(`  - value: ${decoded.args[1].toString()}`);
    } catch (e) {
        console.log('解析失败');
    }

    // ============ 8. 历史余额查询 ============
    console.log('\n=== 8. 历史数据查询 ===\n');

    // 查询 1000 个区块前的余额
    const historicalBlock = blockNumber - 1000;
    try {
        const historicalBalance = await provider.getBalance(vitalikAddress, historicalBlock);
        const currentBalance = await provider.getBalance(vitalikAddress);
        console.log(`Vitalik 在区块 ${historicalBlock} 的余额: ${ethers.formatEther(historicalBalance)} ETH`);
        console.log(`Vitalik 当前余额: ${ethers.formatEther(currentBalance)} ETH`);
        console.log(`变化: ${ethers.formatEther(currentBalance - historicalBalance)} ETH`);
    } catch (error) {
        console.log('历史查询失败:', error.message);
    }

    console.log('\n========================================');
    console.log('数据读取完成!');
    console.log('========================================');
}

// 运行
readChainData()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('错误:', error);
        process.exit(1);
    });
