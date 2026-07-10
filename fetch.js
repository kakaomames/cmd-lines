/**
 * 独自の通信管理関数: fetch
 * @param {string} url - 接続先
 * @param {Object} options - リクエストオプション
*/
(function() {
    // 1. 安全なログ出力関数（定義済みなら使う、なければconsoleを使う）
    const safeLog = (type, msg) => {
        if (typeof missionLog === 'function') {
            missionLog(type, msg);
        } else {
            console.log(`[${type}] ${msg}`);
        }
    };

    // 2. 独自fetchの定義
    async function customFetch(url, options = {}) {
        const timestamp = new Date().toISOString();
        const optionsJson = JSON.stringify(options, null, 2);
        
        safeLog("NETWORK", `[${timestamp}] 接続開始: ${url} | Content: ${optionsJson}`);
        
        try {
            const response = await window.originalFetch(url, options);
            const responseClone = response.clone();
            const data = await responseClone.json().catch(() => "Non-JSON response");
            
            if (response.ok) {
                safeLog("SUCCESS", `通信成功: ${url} (Status: ${response.status}) | Data: ${JSON.stringify(data)}`);
            } else {
                safeLog("ERROR", `通信失敗: ${url} (Status: ${response.status})`);
            }
            return response;
        } catch (error) {
            safeLog("CRITICAL", `通信異常発生: ${error.message}`);
            throw error;
        }
    }

    // 3. セットアップ（二重登録防止）
    if (!window.originalFetch) {
        window.originalFetch = window.fetch;
        window.fetch = customFetch;
        // 定義が終わった後にログを飛ばす
        setTimeout(() => safeLog("SYSTEM", "独自fetchのセットアップ完了！通信の監視を開始するぞ！"), 0);
    }
})();
