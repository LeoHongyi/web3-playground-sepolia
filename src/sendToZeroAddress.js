/**
 * 任务2: 使用 Ethers.js 转账到 Zero Address (0x0000...0000)
 *
 * 注意: 发送到 Zero Address 的 ETH 将永久丢失！
 * 这是一个学习 gas 消耗的练习，仅在测试网进行
 *
 * 查看交易: https://sepolia.etherscan.io/
 */

const { ethers } = require('ethers');
require('dotenv').config();

// Zero Address - 发送到这里的代币将永久丢失
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

async function sendToZeroAddress() {
    // 1. 连接到 Sepolia 测试网
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

    // 2. 创建钱包实例
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log('========================================');
    console.log('转账到 Zero Address 演示');
    console.log('========================================\n');

    // 3. 获取当前账户信息
    const address = wallet.address;
    const balance = await provider.getBalance(address);

    console.log(`你的地址: ${address}`);
    console.log(`当前余额: ${ethers.formatEther(balance)} ETH\n`);

    // 4. 获取当前 gas 价格
    const feeData = await provider.getFeeData();
    console.log('当前 Gas 信息:');
    console.log(`  - Gas Price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} Gwei`);
    console.log(`  - Max Fee: ${feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : 'N/A'} Gwei`);
    console.log(`  - Max Priority Fee: ${feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : 'N/A'} Gwei\n`);

    // 5. 构建交易
    // 发送极小数量的 ETH (0.0001 ETH) 到 Zero Address
    const amountToSend = ethers.parseEther('0.0001');

    const tx = {
        to: ZERO_ADDRESS,
        value: amountToSend,
        // 可选: 添加自定义数据 (会增加 gas 消耗)
        data: '0x', // 空数据
    };

    // 6. 估算 gas
    const estimatedGas = await provider.estimateGas({
        ...tx,
        from: address
    });
    console.log(`预估 Gas Limit: ${estimatedGas.toString()}`);

    // 计算预估费用
    const estimatedCost = estimatedGas * feeData.gasPrice;
    console.log(`预估交易费用: ${ethers.formatEther(estimatedCost)} ETH\n`);

    // 7. 发送交易
    console.log('正在发送交易...');
    const transaction = await wallet.sendTransaction(tx);

    console.log(`交易已发送!`);
    console.log(`交易哈希: ${transaction.hash}`);
    console.log(`Etherscan 链接: https://sepolia.etherscan.io/tx/${transaction.hash}\n`);

    // 8. 等待交易确认
    console.log('等待交易确认...');
    const receipt = await transaction.wait();

    console.log('\n========================================');
    console.log('交易已确认!');
    console.log('========================================');
    console.log(`区块号: ${receipt.blockNumber}`);
    console.log(`实际 Gas 消耗: ${receipt.gasUsed.toString()}`);
    console.log(`交易状态: ${receipt.status === 1 ? '成功' : '失败'}`);

    // 9. 查看更新后的余额
    const newBalance = await provider.getBalance(address);
    const spent = balance - newBalance;
    console.log(`\n交易后余额: ${ethers.formatEther(newBalance)} ETH`);
    console.log(`总花费 (ETH + Gas): ${ethers.formatEther(spent)} ETH`);
}

// 运行
sendToZeroAddress()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('错误:', error);
        process.exit(1);
    });
