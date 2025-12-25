// Service Workerファイル名: sw.js
// キャッシュバージョン。ファイル更新時にはこの番号をインクリメントする
const CACHE_NAME = 'gemini-obj-viewer-cache-v1.0.1';

// オフラインで利用可能にしたいファイルの一覧 (絶対パスまたは相対パス)
// ★重要: GitHub Pagesでホストする場合、パスはリポジトリのルートからの相対パスで記述
const urlsToCache = [
    // アプリケーションのコアファイル
    '/main.py', // 君のメインHTMLファイル
    '/logo.png',                        // 君のロゴ画像
    
    // Three.js と OBJLoader (CDNファイルもキャッシュ対象にする)
    // ただし、外部CDNのキャッシュはService Workerで制御できない場合があるため、
    // ここでは保険として記載し、基本的にはネットワークから取得される前提
    '/templates/game.html',
    '/templates/home.html',
    '/templates/index.html',
    '/templates/url-dl.html',
    '/templates/url-dl2.html',
    '/templates/mqo.html',
    '/templates/pokemonquest.html'
  '/templates/url-search.html',
  '/templates/wasm.html',
     '/templates/wasmv1.html',
  '/templates/github1.html',
  '/templates/license.html',
  '/manifest.json',
  '/sw.js',
  '/vercel.json',
    '/requirements.txt',
    // (必要に応じてCSSファイルやその他のJSファイルも追加する)
];

// -----------------------------------------------------------------
// 1. インストール (Install) イベント
// -----------------------------------------------------------------
// Service Workerが最初に登録されたときに発生する
self.addEventListener('install', (event) => {
    // 古いService Workerを待たずに、すぐに有効化する
    self.skipWaiting();
    
    console.log('[Service Worker] インストール中...');
    
    // キャッシュを開き、urlsToCacheに記載されたファイルをすべて追加
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] キャッシュにファイルを追加中:', urlsToCache);
                return cache.addAll(urlsToCache);
            })
    );
});

// -----------------------------------------------------------------
// 2. 有効化 (Activate) イベント
// -----------------------------------------------------------------
// 古いキャッシュをクリアする
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] 有効化中...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // 古いキャッシュ（CACHE_NAMEと一致しないもの）をすべて削除
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] 古いキャッシュを削除:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// -----------------------------------------------------------------
// 3. フェッチ (Fetch) イベント
// -----------------------------------------------------------------
// ネットワークリクエストが発生したときに、キャッシュを介して応答する
self.addEventListener('fetch', (event) => {
    // OBJファイル（外部リソース）やその他の動的なリクエストは除外
    // これにより、OBJファイルのアップロード/ロードはネットワークから取得される
    // 常にキャッシュから取得したいリクエストのみを処理する
    
    event.respondWith(
        // キャッシュ内にリクエストされたリソースがあるか確認
        caches.match(event.request)
            .then((response) => {
                // キャッシュヒットした場合、キャッシュから応答を返す
                if (response) {
                    console.log(`[Service Worker] キャッシュから取得: ${event.request.url}`);
                    return response;
                }
                
                // キャッシュになかった場合、ネットワークにリクエストを投げる
                console.log(`[Service Worker] ネットワークから取得: ${event.request.url}`);
                return fetch(event.request);
            })
    );
});
