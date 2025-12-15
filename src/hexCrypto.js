/**
 * 任务4: 自定义的 16 进制数据加密解密方式
 *
 * 实现一个简单但有效的加密方案:
 * 1. XOR 加密 - 使用密钥对数据进行异或运算
 * 2. 字节位移 - 对每个字节进行循环位移
 * 3. 混淆 - 添加随机盐值
 *
 * 这可以用于在链上存储加密数据
 */

const crypto = require('crypto');

class HexCrypto {
    constructor(secretKey) {
        // 从密钥生成固定长度的 key
        this.key = crypto.createHash('sha256').update(secretKey).digest();
    }

    /**
     * 加密字符串，返回 0x 开头的十六进制
     * @param {string} plaintext - 要加密的明文
     * @returns {string} - 加密后的十六进制字符串
     */
    encrypt(plaintext) {
        // 1. 生成随机盐值 (8 bytes)
        const salt = crypto.randomBytes(8);

        // 2. 将明文转换为 Buffer
        const plaintextBuffer = Buffer.from(plaintext, 'utf8');

        // 3. 创建加密后的 buffer
        const encrypted = Buffer.alloc(plaintextBuffer.length);

        // 4. XOR 加密 + 字节位移
        for (let i = 0; i < plaintextBuffer.length; i++) {
            // XOR with key byte (循环使用 key)
            let byte = plaintextBuffer[i] ^ this.key[i % this.key.length];

            // XOR with salt byte (循环使用 salt)
            byte = byte ^ salt[i % salt.length];

            // 循环左移 (基于位置)
            const shift = (i % 7) + 1;
            byte = ((byte << shift) | (byte >> (8 - shift))) & 0xff;

            encrypted[i] = byte;
        }

        // 5. 组合: [salt (8 bytes)] + [encrypted data]
        const result = Buffer.concat([salt, encrypted]);

        // 6. 返回 0x 开头的十六进制
        return '0x' + result.toString('hex');
    }

    /**
     * 解密十六进制字符串
     * @param {string} hexString - 0x 开头的加密十六进制字符串
     * @returns {string} - 解密后的明文
     */
    decrypt(hexString) {
        // 1. 移除 0x 前缀并转换为 Buffer
        const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
        const data = Buffer.from(hex, 'hex');

        // 2. 提取盐值和加密数据
        const salt = data.subarray(0, 8);
        const encrypted = data.subarray(8);

        // 3. 创建解密后的 buffer
        const decrypted = Buffer.alloc(encrypted.length);

        // 4. 逆向解密
        for (let i = 0; i < encrypted.length; i++) {
            let byte = encrypted[i];

            // 逆向循环右移
            const shift = (i % 7) + 1;
            byte = ((byte >> shift) | (byte << (8 - shift))) & 0xff;

            // 逆向 XOR with salt
            byte = byte ^ salt[i % salt.length];

            // 逆向 XOR with key
            byte = byte ^ this.key[i % this.key.length];

            decrypted[i] = byte;
        }

        // 5. 转换回字符串
        return decrypted.toString('utf8');
    }

    /**
     * 将普通字符串转为十六进制 (不加密)
     */
    static stringToHex(str) {
        return '0x' + Buffer.from(str, 'utf8').toString('hex');
    }

    /**
     * 将十六进制转为普通字符串 (不解密)
     */
    static hexToString(hex) {
        const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
        return Buffer.from(cleanHex, 'hex').toString('utf8');
    }

    /**
     * 生成用于链上交易 data 字段的加密消息
     * @param {string} message - 要加密的消息
     * @returns {object} - 包含加密数据和元信息
     */
    encryptForChain(message) {
        const encrypted = this.encrypt(message);
        return {
            data: encrypted,
            // 添加一个简单的标识符前缀，表示这是加密数据
            chainData: '0xENC1' + encrypted.slice(2), // ENC1 = 加密版本 1
            originalLength: message.length,
            timestamp: Date.now()
        };
    }

    /**
     * 从链上数据解密
     * @param {string} chainData - 链上的加密数据
     * @returns {string} - 解密后的消息
     */
    decryptFromChain(chainData) {
        // 检查并移除标识符前缀
        if (chainData.startsWith('0xENC1')) {
            chainData = '0x' + chainData.slice(6);
        }
        return this.decrypt(chainData);
    }
}

// ============ 演示 ============

function demo() {
    console.log('========================================');
    console.log('16 进制数据加密解密演示');
    console.log('========================================\n');

    // 使用环境变量中的密钥，或使用默认密钥
    require('dotenv').config();
    const secretKey = process.env.ENCRYPTION_KEY || 'my_default_secret_key';
    const cryptor = new HexCrypto(secretKey);

    // 测试消息
    const messages = [
        'Hello, Ethereum!',
        '这是中文测试消息',
        'Transfer 100 ETH to Alice',
        JSON.stringify({ action: 'vote', proposal: 42, choice: 'yes' })
    ];

    console.log('=== 基础加密解密测试 ===\n');

    for (const msg of messages) {
        console.log(`原文: ${msg}`);

        const encrypted = cryptor.encrypt(msg);
        console.log(`加密: ${encrypted}`);

        const decrypted = cryptor.decrypt(encrypted);
        console.log(`解密: ${decrypted}`);

        console.log(`验证: ${msg === decrypted ? '✓ 成功' : '✗ 失败'}`);
        console.log('---');
    }

    console.log('\n=== 链上数据格式测试 ===\n');

    const chainMessage = 'Secret vote: Proposal #42 = YES';
    console.log(`原始消息: ${chainMessage}`);

    const chainData = cryptor.encryptForChain(chainMessage);
    console.log(`链上数据格式:`);
    console.log(`  - data: ${chainData.data}`);
    console.log(`  - chainData: ${chainData.chainData}`);
    console.log(`  - 原始长度: ${chainData.originalLength}`);

    const recovered = cryptor.decryptFromChain(chainData.chainData);
    console.log(`从链上恢复: ${recovered}`);
    console.log(`验证: ${chainMessage === recovered ? '✓ 成功' : '✗ 失败'}`);

    console.log('\n=== 普通十六进制转换 (无加密) ===\n');

    const plainMsg = 'Hello World';
    const plainHex = HexCrypto.stringToHex(plainMsg);
    console.log(`原文: ${plainMsg}`);
    console.log(`十六进制: ${plainHex}`);
    console.log(`还原: ${HexCrypto.hexToString(plainHex)}`);

    console.log('\n=== 同一消息多次加密 (不同结果，因为有随机盐) ===\n');

    const sameMsg = 'Same message';
    console.log(`消息: ${sameMsg}`);
    for (let i = 1; i <= 3; i++) {
        const enc = cryptor.encrypt(sameMsg);
        console.log(`加密 #${i}: ${enc}`);
    }
    console.log('(每次加密结果不同，但都能正确解密)\n');
}

// 导出模块
module.exports = { HexCrypto };

// 如果直接运行此文件，执行演示
if (require.main === module) {
    demo();
}
