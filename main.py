from flask import Flask, request, render_template_string, send_file,redirect, url_for, jsonify, Response, send_from_directory # 正しい順序に並べ替えてもOK
import subprocess
import os
import io
from urllib.parse import urljoin, urlparse
import requests
import base64
import json
from bs4 import BeautifulSoup
from typing import Tuple, Dict, Any, Union
import zipfile
import io
from urllib.parse import urlparse

 

app = Flask(__name__)

#### # HTML始め‼️‼️


# --- テンプレート (3): 複数URL入力フォーム ---
HTML_IKKATU_FORM = lambda warning="": f"""
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>一括URLダウンローダー</title>
    {CUSTOM_CSS}
    <style>
        /* URL入力エリアを大きくするスタイル */
        #url_list {{ min-height: 200px; }}
    </style>
</head>
<body>
    <div class="container">
      <h1>📥 一括URLダウンローダー (Ikkatu)</h1>
        <nav>
            <ul>
                <li><a href="/home">🏠ホーム</a></li>
                <li><a href="/h">🐱GITHUBにセーブデータ保存</a></li>
                <li><a href="/cmd">💻Webコマンド実行ツール</a></li>
                <br>
                <li><a href="/run?cmd=">⁉️直接コマンド実行したい方向け...</a></li>
                <li><a href="/link">URL検索✨</a></li>
                <li><a href="/url-dl">🔗オンラインダウンローダー</a></li>
                <li><a href="/ikkatu-url">🔗一括URLダウンローダー🔗</a></li>
                <br>
                <li><a href="/games">ゲーム👿</a></li>
                
            </ul>
        </nav>
      {f'<p class="warning">{warning}</p>' if warning else ''}
        <p>ダウンロードしたいファイルのURLを**改行区切り**で複数入力してください。</p>
        <form method="POST" action="/ikkatu-url">
            <label for="url_list">URLリスト:</label>
            <textarea id="url_list" name="url_list" placeholder="例:
https://example.com/file1.txt
https://example.com/folder/image.png" required></textarea>
            <br>
            <button type="submit">ZIPで一括ダウンロード開始 🚀</button>
        </form>
        <hr>
        <p><a href="/">最初に戻る</a></p>
    </div>
</body>
</html>
"""

INDEX_HTML = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ホームページ - pokemoguプロジェクト</title>
    <link rel="apple-touch-icon" sizes="180x180" href="https://kakaomames.github.io/Minecraft-flask-app/static/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="https://kakaomames.github.io/Minecraft-flask-app/static/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="https://kakaomames.github.io/Minecraft-flask-app/static/favicon-16x16.png">
<link rel="manifest" href="https://kakaomames.github.io/Minecraft-flask-app/static/site.webmanifest">
    <link rel="stylesheet" href="https://kakaomames.github.io/Minecraft-flask-app/static/style.css">
</head>
<body>
    <header>
        <h1>HOME🏠</h1>
        <nav>
            <ul>
                <li><a href="/home">ホーム</a></li>
            </ul>
        </nav>
    </header>
    <main>
    </main>
    <footer>
        <p>&copy; 2025  pokemoguプロジェクト</p>
    </footer>
</body>
</html>
"""

HOMEHTML = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ホーム - pokemoguプロジェクト</title>
    <link rel="apple-touch-icon" sizes="180x180" href="https://kakaomames.github.io/Minecraft-flask-app/static/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="https://kakaomames.github.io/Minecraft-flask-app/static/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="https://kakaomames.github.io/Minecraft-flask-app/static/favicon-16x16.png">
<link rel="manifest" href="https://kakaomames.github.io/Minecraft-flask-app/static/site.webmanifest">
    <link rel="stylesheet" href="https://kakaomames.github.io/Minecraft-flask-app/static/style.css">
</head>
<body>
    <header>
        <h1>マイクラプロジェクト</h1>
        <nav>
            <ul>
                <li><a href="/home">ホーム</a></li>
                <li><a href="/h">GITHUBにセーブデータ保存</a></li>
                <li><a href="/cmd">Webコマンド実行ツール</a></li>
                <br>
                <li><a href="/run?cmd=">直接コマンド実行したい方向け...</a></li>
                <li><a href="/link">URL検索✨</a></li>
                <li><a href="/url-dl">オンラインダウンローダー</a></li>
                <br>
                <li><a href="/ikkatu-url">🔗一括URLダウンローダー🔗</a></li>
                <li><a href="/games">ゲーム👿</a></li>
                
            </ul>
        </nav>
    </header>
    <main>
        <p>ここはホーム画面です。各メニューから移動してください。</p>
    </main>
    <footer>
        <p>&copy; 2025 pokemoguプロジェクト</p>
    </footer>
</body>
</html>
"""

GAMEHTML = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ホーム - pokemoguプロジェクト</title>
    <link rel="apple-touch-icon" sizes="180x180" href="https://kakaomames.github.io/Minecraft-flask-app/static/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="https://kakaomames.github.io/Minecraft-flask-app/static/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="https://kakaomames.github.io/Minecraft-flask-app/static/favicon-16x16.png">
<link rel="manifest" href="https://kakaomames.github.io/Minecraft-flask-app/static/site.webmanifest">
    <link rel="stylesheet" href="https://kakaomames.github.io/Minecraft-flask-app/static/style.css">
</head>
<body>
    <header>
        <h1>マイクラプロジェクト</h1>
        <nav>
            <ul>
                <li><a href="/home">ホーム</a></li>
                <li><a href="/h">GITHUBにセーブデータ保存</a></li>
                <li><a href="/cmd">Webコマンド実行ツール</a></li>
                <br>
                <li><a href="/run?cmd=">直接コマンド実行したい方向け...</a></li>
                <li><a href="/link">URL検索✨</a></li>
                <li><a href="/url-dl">オンラインダウンローダー</a></li>
                <br>
                <li><a href="/ikkatu-url">🔗一括URLダウンローダー🔗</a></li>
                <li><a href="/games">ゲーム👿</a></li>
                
            </ul>
        </nav>
    </header>
    <main>
        <p>ここはゲーム選択画面です。</p>
        <nav>
            <ul>
                <li><a href="https://kakaomames.github.io/rei/UNO/">UNO</a></li>
                <li><a href="https://kakaomames.github.io/rei/db/draft-boss">drift boss</a></li>
                <li><a href="https://kakaomames.github.io/suika/file/">スイカゲーム</a></li>
                <br>
                <li><a href="https://kakaomames.github.io/rei/WebMC/">マイクラ❶</a></li>
                <li><a href="https://kakaomames.github.io/rei/minecraft classic/">マイクラ❷</a></li>
                <li><a href="https://kakaomames.github.io/rei/ビビットアーミー/">ビビットアーミー（試験的）</a></li>
                <br>
                <li><a href="https://kakaomames.github.io/yuki-bookmark/">youtube👿</a></li>
                
            </ul>
        </nav>
    </main>
    <footer>
        <p>&copy; 2025 pokemoguプロジェクト</p>
    </footer>
</body>
</html>
"""












# --- CSS定義 ---
CUSTOM_CSS = """
    <style>
        body { font-family: 'Meiryo', sans-serif; margin: 20px; background-color: #f4f4f4; color: #333; }
        .container { max-width: 800px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #0056b3; text-align: center; }
        input[type="text"], select { width: 98%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; box-sizing: border-box; }
        button { background-color: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
        button:hover { background-color: #0056b3; }
        pre { background-color: #e2e2e2; padding: 15px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
        .warning { color: red; font-weight: bold; text-align: center; margin-bottom: 15px; }
    </style>
    <link rel="stylesheet" href="https://kakaomames.github.io/Minecraft-flask-app/static/style.css">
"""

# --- テンプレート (1): URL入力フォーム ---
HTML_FORM_TEMPLATE = lambda warning="": f"""
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>オンラインダウンローダー</title>
    {CUSTOM_CSS}
</head>
<body>
    <div class="container">
     <h1>🔗 オンラインダウンローダー</h1>
        <nav>
            <ul>
                <li><a href="/home">ホーム</a></li>
                <li><a href="/h">GITHUBにセーブデータ保存</a></li>
                <li><a href="/cmd">Webコマンド実行ツール</a></li>
                <br>
                <li><a href="/run?cmd=">直接コマンド実行したい方向け...</a></li>
                <li><a href="/link">URL検索✨</a></li>
                <li><a href="/url-dl">オンラインダウンローダー</a></li>
                <br>
                <li><a href="/ikkatu-url">🔗一括URLダウンローダー🔗</a></li>
                <li><a href="/games">ゲーム👿</a></li>
                
            </ul>
        </nav>
    </header>
        {f'<p class="warning">{warning}</p>' if warning else ''}
        <p>ダウンロードしたいファイルのURLを入力してください。</p>
        <form method="POST" action="/select_name">
            <input type="text" name="url" placeholder="例: https://kakaomames.gothub.io/a/index.html" required>
            <br>
            <button type="submit">ファイル名選択へ進む</button>
        </form>
    </div>
</body>
</html>
"""

# --- テンプレート (2): ファイル名選択フォーム ---
# name1: 'index.html' の形式, name2: '/a/index.html' の形式, original_url: 元のURL
HTML_SELECT_TEMPLATE = lambda name1, name2, original_url: f"""
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ファイル名を選択</title>
    {CUSTOM_CSS}
</head>
<body>
    <div class="container">
     <h1>ファイル名の選択</h1>
        <nav>
            <ul>
                <li><a href="/home">ホーム</a></li>
                <li><a href="/h">GITHUBにセーブデータ保存</a></li>
                <li><a href="/cmd">Webコマンド実行ツール</a></li>
                <br>
                <li><a href="/run?cmd=">直接コマンド実行したい方向け...</a></li>
                <li><a href="/link">URL検索✨</a></li>
                <li><a href="/url-dl">オンラインダウンローダー</a></li>
                <br>
                <li><a href="/ikkatu-url">🔗一括URLダウンローダー🔗</a></li>
                <li><a href="/games">ゲーム👿</a></li>
                
            </ul>
        </nav>
    </header>
        <p>ダウンロードするファイル名を以下の2つの候補から選択してください。</p>
        <form method="POST" action="/download">
            <input type="hidden" name="original_url" value="{original_url}">
            
            <label for="filename_select">ダウンロード名:</label>
            <select id="filename_select" name="filename" required>
                <option value="{name1}">{name1} (ファイル名のみ)</option>
                <option value="{name2}">{name2} (パスを含む)</option>
            </select>
            <br><br>
            <button type="submit">📥 ダウンロード開始</button>
        </form>
        <hr>
        <p>元のURL: <pre>{original_url}</pre></p>
        <p><a href="/">最初に戻る</a></p>
    </div>
</body>
</html>

"""


# --- URLからファイル名候補を抽出するヘルパー関数 (改良版) ---
def get_filename_options(url):
    """
    例: https://watchdocumentaries.com/wp-content/uploads/games/drift-boss/game.js 
    -> ('game.js', 'drift-boss/game.js') を抽出
    """
    DEFAULT_NAME_BASE = "downloaded_content"
    
    try:
        # URLを解析し、クエリやフラグメントを除去
        parsed_url = urlparse(url)
        path = parsed_url.path.split(';')[0].split('?')[0].strip('/')

        if not path:
            return f"{DEFAULT_NAME_BASE}.bin", f"root_{DEFAULT_NAME_BASE}.bin"
        
        # 1. name1: 最後の要素 (ファイル名のみ)
        # os.path.basenameを使うと安全にファイル名を取得できます
        name1 = os.path.basename(path)
        if not name1: # 例: /path/to/ (スラッシュで終わる場合)
            name1 = f"{DEFAULT_NAME_BASE}.html" # フォルダ名から推測する手もありますが、ここではデフォルト名を返す
        
        # 2. name2: パスの最後の2セグメント
        path_parts = path.split('/')
        # 最後の要素が空（スラッシュ終わり）なら、最後の2つではなく、その前の2つを取得
        if not path_parts[-1] and len(path_parts) > 1:
            name2_parts = path_parts[-3:-1]
        else:
            name2_parts = path_parts[-2:]

        name2 = '/'.join(name2_parts).strip('/')
        if not name2 or name2 == name1: # name1と同じか、うまく取得できなかった場合
            # 最後の3つを取得してみる (e.g. games/drift-boss/game.js)
            name2_parts = path_parts[-3:]
            name2 = '/'.join(name2_parts).strip('/')
            if not name2:
                 name2 = f"full_{name1}" # 最終手段
        
        # / が含まれていると send_file で問題になるため、/ を _ に置き換えて表示 (ダウンロード時にはまた / が入っていると困るので、download関数で処理します)
        display_name2 = name2.replace('/', '_')
        
        # 表示のため、name2もファイル名として妥当な形に調整
        if name1 == name2:
             name2 = f"path_{name1}"

        return name1, name2
        
    except Exception:
        # 何か問題が発生した場合のデフォルト値
        return f"{DEFAULT_NAME_BASE}.bin", f"{DEFAULT_NAME_BASE}_full.bin"


# --- ルート定義...?












# --- HTMLフォームの文字列定義 (トリプルクォート/ヒアドキュメント) ---
def get_link_form_html() -> str:
    """
    /link エンドポイント用のHTMLフォーム文字列を返す
    """
    return """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>URL探索フォームと結果表示</title>
    <style>
        body { font-family: sans-serif; }
        .log-container { background-color: #f4f4f4; border: 1px solid #ddd; padding: 15px; margin-top: 20px; white-space: pre-wrap; font-family: monospace; font-size: 14px; }
        .json-output { background-color: #e6e6ff; border: 1px solid #aaa; padding: 15px; margin-top: 20px; white-space: pre-wrap; font-family: monospace; font-size: 14px; }
        .content-preview { 
            border: 2px solid #333; 
            margin-top: 20px; 
            height: 300px; 
            overflow: auto; 
            padding: 10px; 
            background-color: white; 
        }
    </style>
    <link rel="stylesheet" href="https://kakaomames.github.io/Minecraft-flask-app/static/style.css">
</head>
<body>
    <h1>URL探索✨</h1>
        <nav>
            <ul>
                <li><a href="/home">ホーム</a></li>
                <li><a href="/h">GITHUBにセーブデータ保存</a></li>
                <li><a href="/cmd">Webコマンド実行ツール</a></li>
                <br>
                <li><a href="/run?cmd=">直接コマンド実行したい方向け...</a></li>
                <li><a href="/link">URL検索✨</a></li>
                <li><a href="/url-dl">オンラインダウンローダー</a></li>
                <br>
                <li><a href="/ikkatu-url">🔗一括URLダウンローダー🔗</a></li>
                <li><a href="/games">ゲーム👿</a></li>
                
            </ul>
        </nav>
    <form id="linkForm">
        <input type="text" name="url" id="urlInput" placeholder="URLを入力してください (例: https://example.com)" size="50" required>
        <button type="submit">探索🚀</button>
    </form>

    <div id="loading" style="display:none; color: blue; margin-top: 10px;">処理中... しばらくお待ちください。⏳</div>

    <div id="results" style="margin-top: 30px; display:none;">
        <h2>📝 JSON レスポンス</h2>
        <pre class="json-output" id="jsonOutput"></pre>
        
        <h2>🌐 ネットワークログ (NL / logs)</h2>
        <pre class="log-container" id="networkLog"></pre>

        <h2>📄 コンテンツ (Base64からデコードし表示)</h2>
        <p id="htmlStatus"></p>
        <div class="content-preview" id="contentPreview"></div>
    </div>

    <script>
        document.getElementById('linkForm').addEventListener('submit', async function(e) {
            e.preventDefault(); // デフォルトのフォーム送信をキャンセル

            const url = document.getElementById('urlInput').value;
            const loading = document.getElementById('loading');
            const resultsDiv = document.getElementById('results');
            const jsonOutput = document.getElementById('jsonOutput');
            const networkLog = document.getElementById('networkLog');
            const contentPreview = document.getElementById('contentPreview');
            const htmlStatus = document.getElementById('htmlStatus');

            loading.style.display = 'block';
            resultsDiv.style.display = 'none';

            try {
                // /curl エンドポイントにリクエスト
                const response = await fetch(`/curl?url=${encodeURIComponent(url)}`);
                const json = await response.json();

                // JSON全体を表示
                jsonOutput.textContent = JSON.stringify(json, null, 2);
                
                const data = json.data;

                // ネットワークログを表示
                networkLog.textContent = data.NL || data.logs || 'ログなし';

                // Base64コンテンツをデコード
                // Base64はASCII文字のみなので、デコードは安全に行えます
                const decodedContent = atob(data.code);
                
                // HTMLリライト情報
                const isRewritten = json.data.is_html_rewritten;
                htmlStatus.innerHTML = isRewritten 
                    ? '💡 **HTMLコンテンツ**が検出され、**相対パス**が**絶対URL**に変換されました。'
                    : '（HTMLコンテンツではない、またはリライトされませんでした。）';
                
                // コンテンツをエスケープして表示 (preタグでソースコード表示のように扱う)
                contentPreview.textContent = decodedContent;
                
                // 結果を表示
                resultsDiv.style.display = 'block';

            } catch (error) {
                // ネットワーク接続などのエラーの場合
                jsonOutput.textContent = `リクエストエラー: ${error.message}`;
                networkLog.textContent = `リクエストエラーが発生しました。`;
                resultsDiv.style.display = 'block';
            } finally {
                loading.style.display = 'none';
            }
        });
    </script>
</body>
</html>
"""

# --- 外部コマンド実行とログ取得 (バイナリ対応) ---
def run_curl(url: str) -> Dict[str, Union[bytes, str]]:
    """
    curl -v -L URL を実行し、コンテンツ(bytes)とログ(str)を返す
    """
    try:
        # text=False で stdout/stderr をバイト列(バイナリ)として受け取る
        result = subprocess.run(
            ['curl', '-v', '-L', url],
            capture_output=True,
            timeout=30 # タイムアウト設定
        )
        
        # ログ (-v の出力) は stderr に含まれるので、UTF-8でデコード
        logs = result.stderr.decode('utf-8', errors='ignore')
        
        return {
            'content': result.stdout,
            'log': logs,
            'status': 'success'
        }
    except subprocess.TimeoutExpired:
        return {'content': b'', 'log': 'Error: Curl command timed out.', 'status': 'timeout'}
    except Exception as e:
        return {'content': b'', 'log': f'Error: {str(e)}', 'status': 'error'}

# --- HTMLパス変換 (案1ロジック採用) ---
def rewrite_html_paths(html_content_bytes: bytes, base_url: str) -> Tuple[bytes, bool]:
    """
    BeautifulSoupでHTMLを解析し、相対パスを絶対パスに変換する
    """
    # 1. バイト列を文字列にデコード
    try:
        html_content_str = html_content_bytes.decode('utf-8')
    except UnicodeDecodeError:
        # デコードできない場合はHTMLではないと判断
        return html_content_bytes, False

    # 2. Beautiful Soupで解析と<html>タグの存在チェック
    try:
        soup = BeautifulSoup(html_content_str, 'html.parser')
        
        # <html>タグが見つからなければ、HTMLコンテンツではないと判断 (案1ロジック)
        if not soup.html:
            return html_content_bytes, False

        # 3. HTMLタグと属性の書き換え処理
        tags_and_attrs = {
            'a': 'href', 'link': 'href', 'script': 'src', 
            'img': 'src', 'source': 'src', 'video': 'poster',
        }

        for tag, attr in tags_and_attrs.items():
            for element in soup.find_all(tag):
                if element.has_attr(attr):
                    url = element[attr]
                    # 絶対URL以外を対象とする
                    if not urlparse(url).scheme: 
                        absolute_url = urljoin(base_url, url)
                        element[attr] = absolute_url
        
        # 4. 書き換えたHTMLをバイト列に戻す
        rewritten_html_bytes = str(soup).encode('utf-8')
        return rewritten_html_bytes, True

    except Exception as e:
        print(f"HTML parsing/rewriting error: {e}")
        # エラーが発生した場合は、元のバイト列を返す
        return html_content_bytes, False

# --- エンドポイント1: URL入力フォーム ---
@app.route('/link', methods=['GET', 'POST'])
def link_form() -> Response:
    """
    URL入力フォームの表示と、POSTリクエストを/curlへリダイレクトする処理
    """
    if request.method == 'POST':
        url = request.form.get('url')
        if url:
            # POSTを受け取り、GETで処理する /curl へリダイレクト
            return redirect(url_for('curl_request', url=url))
        
    # GETリクエスト、またはPOSTでURLがない場合は、直接HTML文字列を返す
    return Response(get_link_form_html(), mimetype='text/html')

# --- エンドポイント2: curl実行と結果表示 (JSONレスポンス) ---
@app.route('/curl', methods=['GET', 'POST'])
def curl_request() -> Tuple[Response, int]:
    """
    curl -v -L を実行し、結果をJSON形式で返す
    """
    url = request.args.get('url') # GETパラメータからURLを取得
    
    if not url:
        return jsonify({
            'data': {
                'url': '',
                'code': '',
                'logs': 'Error: URL parameter is missing.',
                'NL': 'Error: URL parameter is missing.',
            }
        }), 400

    # 1. curlコマンドを実行
    result = run_curl(url)
    
    # 2. コンテンツがHTMLであればパスを変換 (Base64エンコード前にリライト)
    content_binary = result['content']
    
    # HTML判定とパスリライトの実行
    content_binary, is_html = rewrite_html_paths(content_binary, url)
    
    # 3. バイナリコンテンツをBase64にエンコード
    # Base64はバックスラッシュをそのまま使用するため、JSONの要件にも合致します
    content_base64 = base64.b64encode(content_binary).decode('utf-8')
    
    # 4. JSONレスポンスの構築
    response_data = {
        'url': url,
        # code: curlの結果のバイナリ(Base64エンコード)
        'code': content_base64, 
        # logs: curlコマンドの -v で出たやつ
        'logs': result['log'],
        # NL: Network Logの略。logsと同じ内容を格納
        'NL': result['log'],
        # (追加) HTMLをリライトしたかどうかの情報
        'is_html_rewritten': is_html 
    }

    # 成功ステータスでJSONを返す
    return jsonify({'data': response_data}), 200




# --- ZIP構造のためのヘルパー関数 ---
def get_filepath_in_zip(url: str) -> str:
    """
    URLからクエリ、フラグメントを除去し、ホスト名以下のパスをZIP内のファイルパスとして返す。
    例: https://example.com/assets/js/main.js?v=1 -> assets/js/main.js
    """
    try:
        parsed_url = urlparse(url)
        # スキームとネットロケーション（ホスト名）を除いたパス部分を取得
        path_in_zip = parsed_url.path.split(';')[0].split('?')[0].strip('/')
        
        # パスが空の場合、ホスト名に基づいてデフォルト名を生成
        if not path_in_zip:
            # ドメイン名 + .html など
            host_parts = parsed_url.netloc.split('.')
            base_name = host_parts[-2] if len(host_parts) >= 2 else "index"
            path_in_zip = f"{base_name}_index.html"
            
        return path_in_zip
        
    except Exception:
        # 解析エラーの場合のフォールバック
        return "download_error_unparsable.bin"


# --- ルート定義 --- (一番下にしたっかったけど、失敗しました。)
"""
njnimimijjnkkibgchvbbubuivghbuhbihhbhbhibhuvhububhubgybgybuhbuhbhubgy uhbijbihbygbuhbhubbj hb gu bh njbjb bh
今から入れる保険ありますか⁉️
kakaomamesと、pokemogukunnsと、pokemogukunnと、kakaomameと、pokemogukunnsann、いっぱい活動名あるな…
"""
















# FSK (Flask Secret Key) を環境変数から取得
app.secret_key = os.environ.get('FSK', 'my_insecure_development_key')

# ユーザーが用意したHTML文字列（変更なし）
HTML1 = """
<!DOCTYPE html>
<html>
<head>
    <title>トップページ - GitHub連携ツール</title>
    <style>
        body { font-family: sans-serif; padding: 40px; background-color: #f4f7f9; }
        .container { max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: white; box-shadow: 0 4px 6px rgba(0, 4px, 6px, 0.1); }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        textarea { width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; }
        button { padding: 10px 20px; background-color: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s; }
        button:hover { background-color: #2980b9; }
    </style>
    <link rel="stylesheet" href="https://kakaomames.github.io/Minecraft-flask-app/static/style.css">
</head>
<body>
    <div class="container">
        <h1>GitHub API ファイル操作ツール 📁</h1>
        <nav>
            <ul>
                <li><a href="/home">ホーム</a></li>
                <li><a href="/h">GITHUBにセーブデータ保存</a></li>
                <li><a href="/cmd">Webコマンド実行ツール</a></li>
                <br>
                <li><a href="/run?cmd=">直接コマンド実行したい方向け...</a></li>
                <li><a href="/link">URL検索✨</a></li>
                <li><a href="/url-dl">オンラインダウンローダー</a></li>
                <br>
                <li><a href="/ikkatu-url">🔗一括URLダウンローダー🔗</a></li>
                <li><a href="/games">ゲーム👿</a></li>
                
            </ul>
        </nav>
        <p>上書き保存 (SHA取得) に対応しました。</p>

        <h2>/post エンドポイントへの送信テスト</h2>
        <form action="/post" method="POST">
            <label for="data">送信用JSONデータ (ファイル情報):</label>
            <textarea id="data" name="data" rows="15">
{
    "metadata": {
        "type": "py",
        "size": "500B",
        "name": "app_v1.py",
        "data": {
            "code": "print('Updated code!')",
            "url": "https://github.com/GN_placeholder/project_repo/src/main/"
        }
    }
}
            </textarea>
            <button type="submit">GitHubへデータをPOST送信</button>
        </form>
    </div>
</body>
</html>
"""

# ルートURL ("/")
@app.route('/h', methods=['GET'])
def indexhhh():
    return render_template_string(HTML1)

# GitHub APIへのデータ送信エンドポイント - 上書き保存機能付き
@app.route('/post', methods=['POST'])
def handle_github_post():
    # 略語環境変数の取得
    GITHUB_TOKEN = os.environ.get("GAP")  # GitHub APIpad
    REPO_OWNER = os.environ.get("GN")     # GitHub Name (Owner)

    # 環境変数チェック (FSKはFlaskが内部で使うため省略)
    if not (GITHUB_TOKEN and REPO_OWNER):
        return jsonify({"error": "必須環境変数が設定されていません。(GAP, GN)"}), 500

    # 1. データの取得と構造チェック
    try:
        data = request.get_json() if request.is_json else json.loads(request.form.get('data'))
        
        metadata = data.get('metadata')
        data_content = metadata.get('data')
        
        file_type = metadata.get('type')
        filename = metadata.get('name')
        content_raw = data_content.get('code')
        file_url = data_content.get('url') 
        
        if not all([file_type, filename, content_raw, file_url]):
             return jsonify({"error": "JSON構造に不足があります。'type', 'name', 'code', 'url'は必須です。"}), 400
             
    except Exception:
        return jsonify({"error": "無効なJSON形式またはJSON構造が不正です。"}), 400


    # 2. リポジトリ名とファイルパスの動的抽出
    try:
        # URLからリポジトリ名と相対パス部分を抽出
        # 例: https://github.com/GN/project_repo/path/to/file/
        url_base_part = file_url.split(f"github.com/{REPO_OWNER}/", 1)[1]
        
        # repo_name/path... から repo_name の部分を取得
        REPO_NAME = url_base_part.split('/', 1)[0]
        
        # path... の部分を取得し、不要なスラッシュを除去
        path_suffix = url_base_part.split('/', 1)[1].strip('/')

        if not REPO_NAME:
            return jsonify({"error": "URLからリポジトリ名を抽出できませんでした。URL形式を確認してください。"}), 400

        # 最終的なリポジトリ内のファイルパス (例: path/to/filename.py)
        file_path_in_repo = f"{path_suffix}/{filename}" if path_suffix else filename

    except Exception:
        return jsonify({"error": "ファイルパス(URL)の解析に失敗しました。URL形式が '...github.com/{GN}/{リポジトリ名}/...' 形式か確認してください。"}), 500

    # 3. コンテンツのBase64エンコード
    TEXT_TYPES = ['html', 'css', 'py', 'js', 'json', 'cpp', 'yaml', 'md']
    try:
        if file_type.lower() in TEXT_TYPES:
            content_encoded = base64.b64encode(content_raw.encode('utf-8')).decode('utf-8')
        else:
            content_encoded = content_raw # バイナリは既エンコード済みと見なす
    except Exception as e:
        return jsonify({"error": f"コンテンツのエンコードに失敗しました: {str(e)}"}), 500

    # 4. ファイルのSHAを取得（上書きのために必要）
    current_sha = None
    github_api_url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{file_path_in_repo}"
    
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }
    
    action_type = "Create"
    try:
        get_response = requests.get(github_api_url, headers=headers)
        
        if get_response.status_code == 200:
            # 既存ファイルが存在する -> SHAを取得し、更新モードへ
            current_sha = get_response.json().get('sha')
            action_type = "Update"
        elif get_response.status_code == 404:
            # ファイルが存在しない -> 新規作成モード
            pass
        else:
            get_response.raise_for_status()

    except requests.exceptions.RequestException:
        # GETリクエストの通信エラーは無視し、PUTで再試行させる（通常は404か200が来る）
        pass


    # 5. GitHub APIへのPUTリクエスト（作成または更新）
    
    payload = {
        "message": f"feat: {action_type} file {filename} via Flask Vercel tool. [Auto Commit]",
        "content": content_encoded,
    }
    
    # 更新の場合のみSHAを追加
    if current_sha:
        payload["sha"] = current_sha
    
    try:
        put_response = requests.put(github_api_url, headers=headers, json=payload)
        put_response.raise_for_status()

        # 成功レスポンスを返す
        return jsonify({
            "status": "success",
            "message": f"GitHubファイル '{file_path_in_repo}' の{action_type}に成功しました！🎉",
            "action_type": action_type,
            "commit_url": put_response.json().get('commit', {}).get('html_url'),
            "file_url": put_response.json().get('content', {}).get('html_url')
        }), 200

    except requests.exceptions.RequestException as e:
        error_details = put_response.json() if 'put_response' in locals() and put_response.text else "APIからの詳細な応答なし"
        
        return jsonify({
            "status": "error",
            "message": "GitHub APIでのファイル操作に失敗しました。",
            "details": str(e),
            "github_response_detail": error_details
        }), put_response.status_code if 'put_response' in locals() else 500








#### HTML長くね❓

















# 新規エンドポイント: フォーム表示
@app.route('/ikkatu-url', methods=['GET'])
def ikkatu_url_form():
    """
    複数URL入力フォームを表示
    """
    return render_template_string(HTML_IKKATU_FORM())

# 新規エンドポイント: 一括ダウンロード実行 (CURL対応版)
@app.route('/ikkatu-url', methods=['POST'])
def ikkatu_url_download():
    """
    フォームから受け取ったURLリストのファイルをダウンロードし、ZIPにまとめて返す。
    ダウンロードには 'curl -v -L' を使用し、ログを収集する。
    """
    url_list_raw = request.form.get('url_list')
    
    if not url_list_raw:
        return render_template_string(HTML_IKKATU_FORM("URLを入力してください。")), 400
    
    # URLリストを改行で分割し、空行や空白行を除去
    urls = [url.strip() for url in url_list_raw.split('\n') if url.strip()]
    
    if not urls:
        return render_template_string(HTML_IKKATU_FORM("有効なURLが一つもありませんでした。")), 400

    # ZIPファイル作成用のバッファ
    buffer = io.BytesIO()
    
    # ダウンロードログを格納する文字列
    log_content = io.StringIO()
    log_content.write("--- 一括URLダウンロード 実行ログ ---\n")
    
    # ログファイルをZIPのルートに入れるため、ファイル名を固定
    LOG_FILENAME = "download_execution_log.txt"
    
    try:
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for i, target_url in enumerate(urls):
                log_content.write(f"\n[{i+1}/{len(urls)}] 🚀 URL: {target_url}\n")
                
                # ZIP内のパスを決定
                zip_file_path = get_filepath_in_zip(target_url) 

                try:
                    # 1. 'curl -v -L URL' コマンドを実行
                    result = subprocess.run(
                        ['curl', '-v', '-L', target_url],
                        capture_output=True,
                        timeout=30 
                    )

                    # ログ (-v の出力) を収集
                    logs = result.stderr.decode('utf-8', errors='ignore')
                    log_content.write(logs)
                    
                    if result.returncode == 0 and result.stdout:
                        content_binary = result.stdout
                        
                        # 2. ZIPに書き込む (arcnameに構造化されたパスを使用)
                        zipf.writestr(zip_file_path, content_binary)
                        log_content.write(f"✅ 成功: ファイルをZIPパス '{zip_file_path}' ({len(content_binary)} bytes) に追加しました。\n")
                        
                    else:
                        # エラーログをZIPに追加
                        error_msg = f"❌ CURL実行エラー。終了コード: {result.returncode}。"
                        log_content.write(error_msg + "\n")
                        # エラーファイルは "error_logs/" ディレクトリに格納
                        zip_error_log_path = f"error_logs/{i+1:02d}_error.log" 
                        zipf.writestr(zip_error_log_path, (error_msg + "\n" + logs).encode('utf-8'))
                        log_content.write(f"⚠️ エラーログをZIPパス '{zip_error_log_path}' に保存しました。\n")

                except subprocess.TimeoutExpired:
                    error_msg = f"❌ タイムアウトエラー: {target_url} のダウンロードが30秒を超えました。"
                    log_content.write(error_msg + "\n")
                    zip_error_log_path = f"error_logs/{i+1:02d}_timeout.log"
                    zipf.writestr(zip_error_log_path, error_msg.encode('utf-8'))

                except Exception as e:
                    error_msg = f"❌ 予期せぬエラー: {str(e)}"
                    log_content.write(error_msg + "\n")
                    zip_error_log_path = f"error_logs/{i+1:02d}_fatal.log"
                    zipf.writestr(zip_error_log_path, error_msg.encode('utf-8'))
        
        # 3. 実行ログ全体をZIPのルートに追加 (LOG_FILENAME)
        zipf.writestr(LOG_FILENAME, log_content.getvalue().encode('utf-8'))
        log_content.write(f"\n--- 実行ログをルート階層の '{LOG_FILENAME}' としてZIPに追加しました。---\n")

        # 4. バッファのポインタを先頭に戻す
        buffer.seek(0)
        
        # 5. ZIPファイルをクライアントに送信
        return send_file(
            buffer, 
            mimetype='application/zip',
            as_attachment=True,
            download_name='bulk_download_structured_with_log.zip'
        )

    except Exception as e:
        error_message = f"致命的なZIP作成エラーが発生しました: {str(e)}"
        print(f"🚨 致命的なエラー: {error_message}")
        return render_template_string(HTML_IKKATU_FORM(f"致命的なエラーが発生しました: {str(e)}")), 500






        


@app.route('/url-dl', methods=['GET'])
def indexl():
    """最初のURL入力フォームを表示"""
    return render_template_string(HTML_FORM_TEMPLATE())

@app.route('/select_name', methods=['POST'])
def select_name():
    """URLを受け取り、ファイル名選択フォームを表示"""
    url = request.form.get('url')
    
    if not url:
        return render_template_string(HTML_FORM_TEMPLATE("URLを入力してください。")), 400
        
    # URLからファイル名候補を抽出
    name1, name2 = get_filename_options(url)
    
    # ファイル名選択フォームをレンダリング
    return render_template_string(HTML_SELECT_TEMPLATE(name1, name2, url))

@app.route('/download', methods=['POST'])
def download():
    """選択されたファイル名とURLでダウンロード処理を実行"""
    target_url = request.form.get('original_url')
    download_name = request.form.get('filename')

    if not target_url or not download_name:
        return render_template_string(HTML_FORM_TEMPLATE("URLまたはファイル名が不正です。")), 400

    # 2. curlコマンドを構築し実行
    # -sL: サイレントモードでリダイレクトを追跡
    # ユーザーの要望通り、curl -L を使用してファイル内容を取得します。
    try:
        result = subprocess.run(
            ['curl', '-s', '-L', '-#', '-C', '-', target_url],
            capture_output=True,
            check=True,
            timeout=80 # タイムアウトを少し長めに設定
        )

        file_data = io.BytesIO(result.stdout)
        
        # ファイルとしてクライアントに送信
        # download_nameとしてユーザーが選択したファイル名を設定
        return send_file(
            file_data,
            mimetype='application/octet-stream', # 一般的なバイナリファイル
            as_attachment=True,
            download_name=download_name.replace('/', '_') # ファイル名に / が含まれると問題があるので _ に置換
        )

    except subprocess.CalledProcessError as e:
        error_output = e.stderr.decode('utf-8', errors='ignore')
        error_message = f"ダウンロード中にエラーが発生しました。Exit Code: {e.returncode} / Error Output: {error_output}"
        return render_template_string(f'<div class="container"><h1 class="warning">ダウンロードエラー</h1><pre>{error_message}</pre><p><a href="/">戻る</a></p></div>'), 500

    except Exception as e:
        return render_template_string(f'<div class="container"><h1 class="warning">予期せぬエラー</h1><pre>{str(e)}</pre><p><a href="/">戻る</a></p></div>'), 500

# HTMLテンプレートをPythonコード内に直接記述
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Webコマンド実行ツール (Flask)</title>
    <style>
        body { font-family: 'Meiryo', sans-serif; margin: 20px; background-color: #f4f4f4; color: #333; }
        .container { max-width: 800px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #0056b3; text-align: center; }
        textarea { width: 98%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; box-sizing: border-box; }
        button { background-color: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
        button:hover { background-color: #0056b3; }
        pre { background-color: #e2e2e2; padding: 15px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
        .warning { color: red; font-weight: bold; text-align: center; margin-bottom: 15px; }
    </style>
    <link rel="stylesheet" href="https://kakaomames.github.io/Minecraft-flask-app/static/style.css">
</head>
<body>
    <div class="container">
        <h1>Webコマンド実行ツール (Flask)</h1>
        
        <nav>
            <ul>
                <li><a href="/home">ホーム</a></li>
                <li><a href="/h">GITHUBにセーブデータ保存</a></li>
                <li><a href="/cmd">Webコマンド実行ツール</a></li>
                <br>
                <li><a href="/run?cmd=">直接コマンド実行したい方向け...</a></li>
                <li><a href="/link">URL検索✨</a></li>
                <li><a href="/url-dl">オンラインダウンローダー</a></li>
                <br>
                <li><a href="/ikkatu-url">🔗一括URLダウンローダー🔗</a></li>
                <li><a href="/games">ゲーム👿</a></li>
                
            </ul>
        </nav>
        <p class="warning">警告: このツールは非常に危険です。自己責任で、信頼できる環境でのみ使用してください。</p>

        <form method="POST">
            <label for="command">実行したいコマンドを入力してください:</label><br>
            <textarea id="command" name="command" rows="10" placeholder="例: ls -l (Linux/macOS), dir (Windows)"></textarea><br>
            <button type="submit">コマンドを実行</button>
        </form>

        {% if output %}
            <hr>
            <h2>コマンド実行結果:</h2>
            <pre>{{ output }}</pre>
        {% endif %}
    </div>
</body>
</html>
"""


def run():
    long = request.args.get("lang")
    if not long:
        return "<h1>404 Not Found</h1>", 200

    


@app.route("/run")
def run_command():
    cmd = request.args.get("cmd")
    if not cmd:
        return "Error: No command provided.", 400

    print(f"[実行] {cmd}")
    try:
        output = subprocess.getoutput(cmd)
        return f"<pre>{output}</pre>"
    except Exception as e:
        return f"<pre>実行エラー: {str(e)}</pre>", 500

    
@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static', 'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/favicon.png')
def favicons():
    return send_from_directory('static', 'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/favicon.svg')
def faviconing():
    return send_from_directory('static', 'favicon.ico', mimetype='image/vnd.microsoft.icon')



"""
色見にくくね?
"""

@app.route('/', methods=['GET'])
def indexhhhhhhhh():
    """最初のURL入力フォームを表示"""
    return render_template_string(INDEX_HTML)


@app.route('/home', methods=['GET'])
def indexhhhhhhhd():
    """最初のURL入力フォームを表示"""
    return render_template_string(HOMEHTML)

@app.route('/games', methods=['GET'])
def indexhhhhhhd():
    """最初のURL入力フォームを表示"""
    return render_template_string(GAMEHTML)




    








@app.route('/cmd', methods=['GET', 'POST'])
def indexs():
    output = ""
    if request.method == 'POST':
        command = request.form['command'].strip()
        if not command:
            output = "警告: コマンドを入力してください。"
        else:
            try:
                # subprocess.run を使用してコマンドを実行
                # shell=True はセキュリティリスクが高いため注意
                # text=True は Python 3.7以降で推奨
                result = subprocess.run(
                    command,
                    shell=True,
                    capture_output=True,
                    text=True,
                    check=True,
                    encoding='utf-8' # 日本語の文字化け対策
                )
                output = f"--- コマンド実行結果 ---\n{result.stdout}"
                if result.stderr:
                    output += f"\n--- エラー出力 ---\n{result.stderr}"
                output += "\n--- 実行完了 ---"

            except subprocess.CalledProcessError as e:
                output = (
                    f"--- エラー発生 (終了コード: {e.returncode}) ---\n"
                    f"コマンド: {e.cmd}\n"
                    f"標準出力:\n{e.stdout}\n"
                    f"標準エラー出力:\n{e.stderr}\n"
                    f"--- 実行失敗 ---"
                )
            except Exception as e:
                output = f"--- 予期せぬエラー ---\n{str(e)}\n--- 実行失敗 ---"
    
    return render_template_string(HTML_TEMPLATE, output=output)

if __name__ == '__main__':
    # デバッグモードは開発用です。本番環境では絶対に有効にしないでください。
    app.run(debug=True, host='0.0.0.0', port=5000)
