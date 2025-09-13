// Файл: checkPyth.ts
import { Connection, PublicKey } from '@solana/web3.js';
import 'dotenv/config';

async function checkAccount() {
    // 1. Проверяем наличие RPC_URL
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) {
        console.error("Ошибка: RPC_URL не найден в вашем .env файле!");
        return; // Прерываем выполнение, если URL не найден
    }
    
    // 2. Вставьте сюда ID, который вы хотите проверить
    const PYTH_ACCOUNT_ADDRESS = "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE";
    
    console.log(`Подключаемся к Solana RPC: ${rpcUrl}`);
    // Теперь здесь нет ошибки, так как мы проверили rpcUrl выше
    const connection = new Connection(rpcUrl, 'confirmed'); 
    
    try {
        const pubKey = new PublicKey(PYTH_ACCOUNT_ADDRESS);
        console.log(`\nПроверяем аккаунт по адресу: ${pubKey.toBase58()}`);
        
        const accountInfo = await connection.getAccountInfo(pubKey);
        
        if (accountInfo === null) {
            console.error("\n--- РЕЗУЛЬТАТ: НЕУДАЧА ---");
            console.error("Аккаунт по этому адресу НЕ НАЙДЕН на блокчейне.");
        } else {
            console.log("\n--- РЕЗУЛЬТАТ: УСПЕХ! ---");
            console.log("Аккаунт НАЙДЕН!");
            console.log(`   - Владелец (Owner): ${accountInfo.owner.toBase58()}`);
            console.log(`   - Размер данных (Data size): ${accountInfo.data.length} байт`);
        }
        
    } catch (e) { // Изменено с 'error' на 'e'
        console.error("\n--- РЕЗУЛЬТАТ: КРИТИЧЕСКАЯ ОШИБКА ---");
        // Проверяем, является ли ошибка экземпляром Error, чтобы безопасно получить .message
        if (e instanceof Error) {
            console.error("Произошла ошибка при проверке адреса:", e.message);
        } else {
            console.error("Произошла неизвестная ошибка:", e);
        }
    }
}

checkAccount();