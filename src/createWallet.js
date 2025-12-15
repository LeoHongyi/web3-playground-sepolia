/**
 * 创建新的测试钱包
 *
 * 警告: 此脚本生成的钱包仅用于测试网！
 * 不要在主网使用，不要存入真实资产！
 */

const { ethers } = require('ethers');

function createTestWallet() {
    // 创建随机钱包
    const wallet = ethers.Wallet.createRandom();

    console.log('========================================');
    console.log('新测试钱包已创建');
    console.log('========================================\n');

    console.log('地址 (Address):');
    console.log(`  ${wallet.address}\n`);

    console.log('私钥 (Private Key):');
    console.log(`  ${wallet.privateKey}\n`);

    console.log('助记词 (Mnemonic):');
    console.log(`  ${wallet.mnemonic.phrase}\n`);

    console.log('========================================');
    console.log('重要提示:');
    console.log('========================================');
    console.log('1. 将私钥复制到 .env 文件的 PRIVATE_KEY 字段');
    console.log('2. 妥善保存助记词（可用于恢复钱包）');
    console.log('3. 此钱包仅用于 Sepolia 测试网！');
    console.log('4. 去水龙头领取测试 ETH:');
    console.log('   https://cloud.google.com/application/web3/faucet/ethereum/sepolia');
    console.log('========================================\n');
}

createTestWallet();
