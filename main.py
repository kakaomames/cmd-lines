import flask
from flask import Flask, request, render_template_string, render_template, send_file,redirect, url_for, jsonify, Response, send_from_directory # 正しい順序に並べ替えてもOK
from flask_socketio import SocketIO, emit, join_room, leave_room
import subprocess
import wasmtime
import os
import io
from urllib.parse import urljoin, urlparse
import requests
import base64
import json
from bs4 import BeautifulSoup
from typing import Tuple, Dict, Any, Union
import zipfile
from io import BytesIO
from urllib.parse import urlparse
from flask_cors import CORS
import math
 
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN") # Vercelの環境変数で設定
GITHUB_OWNER = "kakaomames"        # あなたのGitHubユーザー名
GITHUB_REPO = "backup"            # データ保存用のリポジトリ名
GAME_FOLDER = "pokeque"



app = Flask(__name__)
app.config['SECRET_KEY'] = 'SECRET_KEY_TEST'
socketio = SocketIO(app, cors_allowed_origins="*")

# CORS許可
CORS(app)

GITHUB_BASE_URL = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/contents/"
HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}

#### # HTML始め‼️‼️!.!..?
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024
print("aaaaaaa")



def _get_github_api_url(username: str) -> str:
    """ユーザー名に基づいて完全なGitHub API URLを生成する"""
    # 目的のパス: pokeque/{username}/save.json
    content_path = f"{GAME_FOLDER}/{username}/save.json"
    return GITHUB_BASE_URL + content_path

def _get_content_info(github_url: str) -> Union[Dict[str, Any], None]:
    """ファイルの現在のSHAを取得する"""
    response = requests.get(github_url, headers=HEADERS)
    if response.status_code == 200:
        return response.json()
    elif response.status_code == 404:
        return None # ファイルが存在しない
    else:
        response.raise_for_status()
        return None
     
# ----------------------------------------------------
# 1-1. Wasm解析ロジック (コア部分)
# ----------------------------------------------------



import wasmtime

def analyze_wasm_module(wasm_data: bytes) -> dict:
    """
    Wasmバイナリデータを解析し、Import情報、Export情報、Customセクションを抽出し、言語を推測する。
    
    Args:
        wasm_data (bytes): Wasmバイナリデータ
        
    Returns:
        dict: 解析結果
    """
    
    analysis_result = {
        "status": "failure",
        "language_guess": "Unknown",
        "imports": [],
        "exports": [],          
        "custom_sections": [],  
        "has_data_segments": False, 
        "error": None
    }
    
    try:
        # 1. StoreオブジェクトとEngineを作成
        engine = wasmtime.Engine()
        store = wasmtime.Store(engine)
        
        # 2. Wasmバイナリからモジュールをロード（解析）
        module = wasmtime.Module(store.engine, wasm_data) 
        
        # 3. Import情報の抽出 (言語推測の主要な手がかり)
        for imp in module.imports:
            # 互換性確保のため、module_name/module属性の有無をチェック
            module_name = getattr(imp, 'module_name', getattr(imp, 'module', ''))
            func_name = getattr(imp, 'name', '')
            
            imp_name = f"{module_name}.{func_name}"
            analysis_result["imports"].append(imp_name)

        # 4. Export情報の抽出 (外部から呼び出し可能なロジックの手がかり)
        for exp in module.exports:
            # ★修正済み: exp.typeのクラス名から型名を安全に抽出 ('MemoryType' object has no attribute 'kind'を回避)
            type_name = type(exp.type).__name__.replace('Type', '')
            
            exp_kind = str(type_name)
            
            analysis_result["exports"].append(f"{exp.name} ({exp_kind})")

        # 5. データセクションの確認 (初期データ/文字列の手がかり)
        # ExportされたアイテムにMemoryが存在するかどうかで、間接的にデータセクションの存在を推測
        analysis_result["has_data_segments"] = any(type(e.type).__name__.startswith('Memory') for e in module.exports)


        # 6. 言語の推測ロジック (Import関数名による判定)
        imports_text = " ".join(analysis_result["imports"])
        
        if "__wbindgen_" in imports_text or "rust_begin_panic" in imports_text:
            analysis_result["language_guess"] = "Rust (wasm-bindgen)"
        elif "emscripten_" in imports_text or "_sbrk" in imports_text:
            analysis_result["language_guess"] = "C/C++ (Emscripten)"
        elif "syscall/js" in imports_text or "runtime." in imports_text:
            analysis_result["language_guess"] = "Go (TinyGo)"
        else:
            analysis_result["language_guess"] = "Native or Generic WASM (C/C++/Rustの可能性あり)"

        # 成功ステータスに更新
        analysis_result["status"] = "success"

        # Import/Exportが多すぎる場合は一部を省略
        if len(analysis_result["imports"]) > 50:
            analysis_result["imports"] = analysis_result["imports"][:50]
            analysis_result["imports_truncated"] = True
            
        if len(analysis_result["exports"]) > 50:
            analysis_result["exports"] = analysis_result["exports"][:50]
            analysis_result["exports_truncated"] = True

        return analysis_result

    except wasmtime.WasmtimeError as e:
        analysis_result["error"] = f"Wasmtimeによる解析エラー (Wasmファイルが不正な可能性があります): {e}"
        return analysis_result
    except Exception as e:
        # 予期せぬエラーの場合、エラーメッセージを出力
        analysis_result["error"] = f"予期せぬエラー: {e}"
        return analysis_result

# ----------------------------------------------------
# 2. URLからのWasm取得機能
# ----------------------------------------------------

def fetch_wasm_from_url(url):
    """URLからWasmバイナリを取得する関数"""
    try:
        # タイムアウトを設定し、リクエスト
        response = requests.get(url, timeout=15) # タイムアウトを少し長めに設定
        # 200番台以外のステータスコードなら例外を発生
        response.raise_for_status() 
        
        # Content-TypeがWASMでない場合も一応チェック
        content_type = response.headers.get('Content-Type', '')
        if 'wasm' not in content_type and 'octet-stream' not in content_type:
             return {"error": f"Content-TypeがWasmではありません: {content_type}"}
        
        # バイナリデータとして返す
        return response.content
        
    except requests.exceptions.RequestException as e:
        # リクエストエラー (接続失敗、タイムアウト、4xx/5xxエラーなど)
        return {"error": f"URLからのファイル取得中にエラーが発生しました: {e}"}


     


# app.py の mqo_to_obj_and_mtl 関数

def mqo_to_obj_and_mtl(mqo_content, base_name):
    """
    MQOファイルを解析し、OBJとMTL形式の文字列を返します。
    このバージョンでは、座標縮小、NaNチェック、Y軸シフトに加え、
    ダミー法線(vn)を生成してOBJ構文をv/vt/vn形式にします。
    """
    SCALE_FACTOR = 0.005 

    mqo_content = mqo_content.replace('\r\n', '\n')
    
    vertices = []
    tex_coords = []
    faces = []
    materials = {} 
    # 【追加】法線リストを定義 (ここではダミー法線一つのみ)
    normal_coords = [(0.0, 1.0, 0.0)] 
    
    in_vertex_data = False
    in_face_data = False
    
    current_mat_index = 0
    mat_count = 0
    
    # ------------------ 1. MTLファイル作成に必要な材質情報を抽出 ------------------
    # ... (変更なし。省略) ...
    for line in mqo_content.split('\n'):
        line = line.strip()
        
        if line.startswith('Material'):
            try:
                mat_count = int(line.split()[1])
            except:
                continue
        elif line.startswith('"') and current_mat_index < mat_count:
            try:
                mat_name = line.split('"')[1]
                materials[current_mat_index] = mat_name
                current_mat_index += 1
            except:
                pass
            
    if not materials:
        materials[0] = "default_material"
    
    # ------------------ 2. OBJデータ抽出（v, vt, f） ------------------
    
    for line in mqo_content.split('\n'):
        line = line.strip()
        
        if not line or line.startswith('#'): continue
        
        # --- チャンクの開始/終了の検出と状態遷移 ---
        if line.startswith('vertex'):
            in_vertex_data = True
            in_face_data = False 
            continue
        
        elif line.startswith('face'):
            in_vertex_data = False 
            in_face_data = True
            continue
        
        elif line == '}':
            in_vertex_data = False
            in_face_data = False
            continue

        # 頂点データの抽出 (v)
        if in_vertex_data and len(line) > 0 and line[0].isdigit(): 
            try:
                coords = [c for c in line.split() if c]
                
                if len(coords) >= 3:
                    x = float(coords[0])
                    y = float(coords[1])
                    z = float(coords[2])
                    
                    if math.isfinite(x) and math.isfinite(y) and math.isfinite(z): 
                         y_shifted = y + 25.0 
                         # 座標をSCALE_FACTOR (0.005) で自動縮小
                         vertices.append((x * SCALE_FACTOR, y_shifted * SCALE_FACTOR, z * SCALE_FACTOR)) 
                    
            except ValueError:
                continue

        # 面データ、UV座標、マテリアル情報の抽出 (f, vt, usemtl)
        elif in_face_data and len(line) > 0 and line[0].isdigit():
            v_index_start = line.find('V(')
            uv_index_start = line.find('UV(')
            mat_index_start = line.find('M(')
            
            mat_name = materials.get(0, "default_material")
            if mat_index_start != -1:
                mat_index_end = line.find(')', mat_index_start)
                if mat_index_end != -1:
                    try:
                        mat_idx = int(line[mat_index_start + 2:mat_index_end].strip())
                        mat_name = materials.get(mat_idx, mat_name)
                    except:
                        pass
            
            if v_index_start != -1: 
                v_index_end = line.find(')', v_index_start)
                
                uv_indices = []
                if uv_index_start != -1:
                    uv_index_end = line.find(')', uv_index_start)
                    if uv_index_end != -1:
                        uv_str = line[uv_index_start + 3:uv_index_end].strip()
                        if uv_str:
                            uv_raw_values = [c for c in uv_str.split() if c]
                            try:
                                current_face_uv_indices = []
                                for i in range(0, len(uv_raw_values), 2):
                                    u = float(uv_raw_values[i])
                                    v = float(uv_raw_values[i+1])
                                    if math.isfinite(u) and math.isfinite(v):
                                        tex_coords.append((u, v))
                                        current_face_uv_indices.append(len(tex_coords))
                                    else:
                                        continue
                                uv_indices = current_face_uv_indices
                            except ValueError:
                                pass
                
                if v_index_end != -1:
                    v_indices_str = line[v_index_start + 2:v_index_end].strip()
                    
                    if v_indices_str:
                        v_indices = [c for c in v_indices_str.split() if c]
                        try:
                            obj_v_indices = [str(int(i) + 1) for i in v_indices]

                            face_elements = []
                            # 【修正】f行を v/vt/vn 形式で構築
                            for i, v_idx in enumerate(obj_v_indices):
                                vt_idx = uv_indices[i] if uv_indices and i < len(uv_indices) else ''
                                # 【重要】vnインデックスは常に1 (normal_coordsの最初の要素)
                                vn_idx = 1 
                                
                                face_elements.append(f"{v_idx}/{vt_idx}/{vn_idx}")
                                    
                            faces.append({
                                'elements': face_elements,
                                'material': mat_name
                            })
                        except ValueError:
                            continue
    
    # ------------------ 3. OBJ形式の文字列を構築 ------------------
    obj_output = f"# Converted from MQO by Flask App (Scaled by {SCALE_FACTOR} with Dummy Normals)\n"
    obj_output += f"mtllib {base_name}.mtl\n"
    obj_output += f"o {base_name}_mesh\n" 
    
    obj_output += "\n# Vertices\n"
    for v in vertices:
        obj_output += f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n"

    obj_output += "\n# Texture Coordinates\n"
    for uv in tex_coords:
        obj_output += f"vt {uv[0]:.6f} {uv[1]:.6f}\n" 
    
    # 【追加】法線データの出力 (vn)
    obj_output += "\n# Normals\n"
    for vn in normal_coords:
        obj_output += f"vn {vn[0]:.6f} {vn[1]:.6f} {vn[2]:.6f}\n"
        
    obj_output += "\n# Faces (v/vt/vn index)\n"
    current_mat = None
    for face in faces:
        if face['material'] != current_mat:
            obj_output += f"usemtl {face['material']}\n"
            current_mat = face['material']
        obj_output += f"f {' '.join(face['elements'])}\n"
        
    # ------------------ 4. MTL形式の文字列を構築 ------------------
    mtl_output = f"# Material File for {base_name}.obj\n"
    
    for index, name in materials.items():
        mtl_output += f"\nnewmtl {name}\n"
        mtl_output += f"Kd 1.000 1.000 1.000\n" 
        mtl_output += f"Ka 1.000 1.000 1.000\n"

    return obj_output, mtl_output



 

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
# print("link")
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
# print("curl")
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
from urllib.parse import urlparse

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


# ルートURL ("/")
@app.route('/h', methods=['GET'])
# print("/h")
def indexhhh():
    return render_template('github1.html')

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



import os
import random
import requests
from flask import Flask, request, render_template_string



# レスポンスを表示するためのシンプルなHTMLテンプレート
XEROXAPP_TEMPLATE = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML取得結果</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 20px; background-color: #f4f7f6; color: #333; }
        h1 { color: #007bff; }
        .container { background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 900px; margin: auto; }
        pre { 
            background-color: #282c34; 
            color: #f8f8f8; 
            padding: 15px; 
            border-radius: 4px; 
            overflow-x: auto; 
            white-space: pre-wrap; 
            word-break: break-all;
            max-height: 400px;
        }
        .error { color: #dc3545; font-weight: bold; background-color: #ffe0e0; padding: 10px; border-radius: 4px; }
        .info { margin-bottom: 20px; border-left: 4px solid #ffc107; padding-left: 10px; background-color: #fffbe6; padding: 10px; border-radius: 4px; }
        .usage { margin-top: 30px; padding: 10px; border: 1px dashed #ccc; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>外部HTML取得結果 (Flaskサーバー実行) 🚀</h1>
        <div class="info">
            <strong>使用方法:</strong> ブラウザで <code>/fetch?number=X</code> にアクセスしてください。<br>
            X = 1: 1桁 (0-9), X = 2: 2桁 (00-99), X = 3: 3桁 (000-999), X = 4: 4桁 (0000-9999)
        </div>
        
        <p><strong>リクエスト詳細:</strong></p>
        <ul>
            <li><strong>要求された桁数パート (number):</strong> {{ number_part }}</li>
            <li><strong>生成されたランダム番号:</strong> {{ random_part }}</li>
            <li><strong>フェッチ先の完全なURL:</strong> <code>{{ full_url }}</code></li>
            <li><strong>ステータスコード:</strong> <span style="color: {{ '#dc3545' if status_code != 200 else '#198754' }}; font-weight: bold;">{{ status_code }}</span></li>
        </ul>

        <h2>取得したHTMLコンテンツ:</h2>
        {% if error_message %}
            <pre class="error">エラー: {{ error_message }}</pre>
        {% else %}
            <pre>{{ html_content }}</pre>
        {% endif %}

        <div class="usage">
            <p><strong>実行環境:</strong> このフェッチはサーバーサイド (Python) で実行されています。これにより、外部サイトのHTMLを問題なく取得できます。</p>
        </div>
    </div>
</body>
</html>
"""

def generate_url_and_fetch(number_param):
    """
    numberパラメータに基づいてランダムな数字を生成し、URLを構築してフェッチを実行します。
    """
    
    # 桁数とゼロパディングのフォーマットを決定
    max_val = None
    padding = None
    
    # number_paramの型を文字列として扱う
    if number_param == '1':
        max_val = 9
        padding = 1
    elif number_param == '2':
        max_val = 99
        padding = 2
    elif number_param == '3':
        max_val = 999
        padding = 3
    elif number_param == '4':
        max_val = 9999
        padding = 4
    else:
        # 無効なパラメータの場合
        return {
            "status_code": 400,
            "error_message": f"無効な 'number' パラメータです。'{number_param}' ではなく、1, 2, 3, 4のいずれかを指定してください。",
            "number_part": number_param,
            "random_part": "N/A",
            "full_url": "N/A",
            "html_content": ""
        }

    # ランダムな数字を生成し、ゼロパディング
    random_num = random.randint(0, max_val)
    random_part = str(random_num).zfill(padding) 
    
    # ターゲットURLを構築
    full_url = f"https://xeroxapp{random_part}.vercel.app"
    
    # コンソールに情報を表示
    print(f"--- Pythonフェッチログ ---")
    print(f"要求桁数: {padding} (number={number_param})")
    print(f"生成された番号: {random_part}")
    print(f"フェッチ先URL: {full_url}")

    # HTMLコンテンツの取得
    try:
        # requestsで外部URLにアクセス
        # ユーザーエージェントを設定し、タイムアウトを設定
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(full_url, timeout=15, headers=headers)
        
        status_code = response.status_code
        
        # 成功の場合
        if status_code == 200:
            html_content = response.text.strip()
            print(f"ステータスコード: {status_code} (成功)")
            return {
                "status_code": status_code,
                "error_message": None,
                "number_part": number_param,
                "random_part": random_part,
                "full_url": full_url,
                "html_content": html_content
            }
        # 成功以外の場合
        else:
            error_message = f"外部サーバーエラー: HTTPステータスコード {status_code} - ページの取得に失敗しました。"
            print(f"ステータスコード: {status_code} (エラー)")
            return {
                "status_code": status_code,
                "error_message": error_message,
                "number_part": number_param,
                "random_part": random_part,
                "full_url": full_url,
                "html_content": ""
            }

    except requests.exceptions.RequestException as e:
        # タイムアウトや接続エラーなど
        error_message = f"リクエスト中にエラーが発生しました: {e}"
        print(f"エラー: {error_message}")
        return {
            "status_code": 500,
            "error_message": error_message,
            "number_part": number_param,
            "random_part": random_part,
            "full_url": full_url,
            "html_content": ""
        }
    finally:
        print(f"--- 処理完了 ---")

@app.route('/xerxapp', methods=['GET'])
def fetch_external_html():
    """
    URLのクエリパラメータ 'number' に基づいて外部HTMLをフェッチし、結果をレンダリングします。
    """
    # URLから 'number' パラメータを取得 (デフォルトは '1')
    number_param = request.args.get('number', '1') 
    
    # フェッチロジックを実行
    result = generate_url_and_fetch(number_param)

    # テンプレートをレンダリングして返す
    return render_template_string(
        XEROXAPP_TEMPLATE,
        number_part=result['number_part'],
        random_part=result['random_part'],
        full_url=result['full_url'],
        status_code=result['status_code'],
        error_message=result['error_message'],
        html_content=result['html_content']
    )















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
        # ZIPファイルをオープンし、処理を開始
        # ZIPファイル全体はディスクではなく、メモリバッファ(buffer)に作成されます
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for i, target_url in enumerate(urls):
                log_content.write(f"\n[{i+1}/{len(urls)}] 🚀 URL: {target_url}\n")
                
                # ZIP内のパスを決定 (構造化)
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
                        
                        # 2. ZIPに書き込む
                        zipf.writestr(zip_file_path, content_binary)
                        log_content.write(f"✅ 成功: ファイルをZIPパス '{zip_file_path}' ({len(content_binary)} bytes) に追加しました。\n")
                        
                    else:
                        # エラーログをZIPに追加
                        error_msg = f"❌ CURL実行エラー。終了コード: {result.returncode}。"
                        log_content.write(error_msg + "\n")
                        # エラーファイルは "error_logs/" ディレクトリに格納
                        zip_error_log_path = f"error_logs/{i+1:02d}_error.log" 
                        # エラーメッセージとcurlログをエラーファイルとしてZIPに追加
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
        
            # 🚀 ZIPクローズエラー解消の修正ポイント
            # 実行ログ全体をZIPのルートに追加 (LOG_FILENAME)
            # withブロックの内側なので、zipfはまだ開いています。
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
        # この try-except は主に ZIP作成失敗などの致命的なエラーをキャッチします
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
    return render_template('index.html')


@app.route('/home', methods=['GET'])
def indexhhhhhhhd():
    """最初のURL入力フォームを表示"""
    return render_template('home.html')

@app.route('/games', methods=['GET'])
def indexhhhhhhd():
    """最初のURL入力フォームを表示"""
    return render_template('game.html')




    








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



    
import json
import requests
import urllib.parse
from flask import Flask, jsonify, request, render_template_string, send_file
import io # ダウンロードのためにバイトデータを扱う

# ----------------------------------------------------------------------
# 1. セットアップと定数の定義
# ----------------------------------------------------------------------



# 外部APIのベースURL
TURBOWARP_API_BASE = "https://trampoline.turbowarp.org/api/projects/"
# プロジェクト本体を取得するためのCURLコマンドのベースURL (ユーザー指定)
BASE_URL = "https://xeroxapp032.vercel.app/dl?data_url="
print(f"BASE_URL:{BASE_URL}")

# ----------------------------------------------------------------------
# 2. HTMLテンプレートの定義 (index.html, license.html)
# ----------------------------------------------------------------------

# index.html
INDEXSS_HTML = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>Scratchプロジェクトデータ取得</title>
    <style>
        body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        input[type="text"] { width: 80%; padding: 10px; margin-right: 10px; }
        button { padding: 10px 20px; cursor: pointer; }
        pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; white-space: pre-wrap; word-break: break-all; }
        .result-section { margin-top: 20px; border-top: 2px solid #ccc; padding-top: 15px; }
        .download-link, .license-link { margin-top: 15px; display: block; }
    </style>
</head>
<body>
    <h1>Scratchプロジェクトデータ解析</h1>
    <p>プロジェクトのURLを入力してください（トークン付きも可）。</p>
    
    <input type="text" id="projectUrl" placeholder="例: https://projects.scratch.mit.edu/123456789?token=..." value="https://scratch.mit.edu/projects/846673644">
    <button onclick="getData()">データ取得</button>
    
    <a href="/license" target="_blank" class="license-link">ライセンス（免責事項）を確認する</a>

    <div id="result" class="result-section" style="display:none;">
        <h2>📝 解析結果</h2>
        <pre id="jsonOutput"></pre>
        
        <p>
            ⚠️ **ダウンロードステップ:** トークンが切れる前に、以下のボタンをクリックしてプロジェクトデータを取得してください。
        </p>
        <button id="downloadButton" onclick="downloadFile()" style="padding: 15px; background-color: #4CAF50; color: white; border: none; border-radius: 5px;">
            💾 プロジェクトファイル (.sb3) をダウンロード
        </button>
    </div>

    <script>
        // ボタンクリックでAPIを呼び出す関数
        function getData() {
            const fullUrl = document.getElementById('projectUrl').value;
            // URLからプロジェクトIDを抽出 (正規表現でID部分のみを取得)
            //例:https://scratch.mit.edu/projects/1059423894
            const match = fullUrl.match(/scratch\.mit\.edu\/projects\/(\d+)/);
            if (!match) {
                alert("有効なScratchプロジェクトURLを入力してください。");
                return;
            }
            const projectId = match[1];
            
            // Flask APIへGETリクエスト
            fetch(`/projects/${projectId}`)
                .then(response => response.json())
                .then(data => {
                    // 取得したJSONデータを整形して表示
                    document.getElementById('jsonOutput').textContent = 
                        JSON.stringify(data, null, 2);
                    document.getElementById('result').style.display = 'block';
                    
                    // ダウンロードボタンに data_url を保持させる
                    const downloadButton = document.getElementById('downloadButton');
                    downloadButton.setAttribute('data-url', data.data_url);
                    
                    alert('データ取得完了！トークンを確認し、ダウンロードに進んでください。');
                })
                .catch(error => {
                    console.error('API Error:', error);
                    document.getElementById('jsonOutput').textContent = 
                        'データの取得に失敗しました。プロジェクトIDを確認してください。';
                    document.getElementById('result').style.display = 'block';
                });
        }
        
        // ダウンロード処理関数
        function downloadFile() {
            const downloadButton = document.getElementById('downloadButton');
            const dataUrl = downloadButton.getAttribute('data-url');
            
            if (!dataUrl || dataUrl.includes("トークンが見つからなかった")) {
                alert("トークンがないため、ダウンロードできません。トークン付きのURLで再試行してください。");
                return;
            }
            
            // data_urlをクエリパラメータとして /dl に渡し、ダウンロードを開始させる
            window.location.href = `/dl?data_url=${encodeURIComponent(dataUrl)}`;
        }
    </script>
</body>
</html>
"""

# license.html
LICENSE_HTML = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>ライセンスと免責事項</title>
    <style>
        body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #CC0000; }
        p { line-height: 1.6; }
    </style>
</head>
<body>
    <h1>⚠️ ライセンスと免責事項 ⚠️</h1>
    <p>
        **このサイトを使って得たデータ（Scratchプロジェクトファイルなど）において、我々は一切の責任を負いません。**
    </p>
    <p>
        プロジェクトファイルの利用は、元のプロジェクト作者の意図およびScratchの利用規約（著作権、コミュニティガイドライン）に従ってください。
    </p>
    <p>
        本サービスは、あくまで解析とデータ取得の補助を目的としています。ファイルの内容、著作権、および利用によって生じるいかなる問題についても、利用者の責任となります。
    </p>
    <a href="/scratch">ホームに戻る</a>
</body>
</html>
"""


# ----------------------------------------------------------------------
# 3. ルートの定義
# ----------------------------------------------------------------------
# 3-1. home /scratch (scratch.html)
@app.route('/scratch')
def scratch():
    """scratchページを表示する。"""
    return render_template_string(INDEXSS_HTML)
print(f"Flask Route: /indexss を定義しました。")


# 3-2. ライセンス /license (license.html)
@app.route('/license')
def license_page():
    """免責事項ページを表示する。"""
    return render_template_string(LICENSE_HTML)
print(f"Flask Route: /license を定義しました。")


# 3-3. プロジェクト情報取得 API /projects/<id> (前回と同一ロジック)
@app.route('/projects/<int:project_id>', methods=['GET', 'POST'])
def get_project_data(project_id):
    """TurboWarp APIからプロジェクト情報を取得し、整形して返す。"""
    
    # ... [前回の get_project_data のロジックとほぼ同じ] ...
    
    api_url = f"{TURBOWARP_API_BASE}{project_id}"
    print(f"APIリクエストURL:{api_url}")

    # Curlコマンドのログ出力 (ご要望のログとしてprint)
    curl_command = f"curl -v -L {api_url}"
    print(f"Curl実行シミュレーション: {curl_command}")

    try:
        response = requests.get(api_url)
        response.raise_for_status() 
        raw_data = response.json()
        print(f"raw_dataを正常に取得しました。ID:{raw_data.get('id')}")

    except requests.exceptions.RequestException as e:
        error_message = f"APIからのデータ取得中にエラーが発生しました: {e}"
        print(f"エラー:{error_message}")
        return jsonify({"error": error_message}), 500

    project_token = raw_data.get("project_token", "N/A")
    print(f"project_token:{project_token}")
    
    # データの整形とdata_urlの生成 (省略せずすべて含めます)
    sorted_data = {
        "id": raw_data.get("id"),
        "title": raw_data.get("title"),
        "project_token": project_token,
        "description": raw_data.get("description"),
        "instructions": raw_data.get("instructions"),
        "visibility": raw_data.get("visibility"),
        "public": raw_data.get("public"),
        "comments_allowed": raw_data.get("comments_allowed"),
        "is_published": raw_data.get("is_published"),
        
        "author_id": raw_data.get("author", {}).get("id"),
        "author_username": raw_data.get("author", {}).get("username"),
        "author_scratchteam": raw_data.get("author", {}).get("scratchteam"),
        "author_joined": raw_data.get("author", {}).get("history", {}).get("joined"),
        "author_profile_images": raw_data.get("author", {}).get("profile", {}).get("images", {}),
        
        "image": raw_data.get("image"),
        "images": raw_data.get("images", {}),
        "history": raw_data.get("history", {}),
        "stats": raw_data.get("stats", {}),
        "remix": raw_data.get("remix", {}),
        "tags": raw_data.get("tags", []),
    }
    
    if project_token and project_token != "N/A":
        project_data_url = f"https://projects.scratch.mit.edu/{project_id}?token={project_token}"
        encoded_project_data_url = urllib.parse.quote_plus(project_data_url)
        DATA_URL = f"{BASE_URL}{encoded_project_data_url}"
        print(f"DATA_URL:{DATA_URL}")
        sorted_data["data_url"] = DATA_URL
    else:
        sorted_data["data_url"] = "トークンが見つからなかったため、プロジェクトデータ本体のURLは生成できませんでした。"
        print(f"data_url:トークンなしで生成できませんでした。")

    return jsonify(sorted_data)
print(f"Flask Route: /projects/<int:project_id> (API) を定義しました。")


# 3-4. ダウンロード処理 /dl
@app.route('/dl')
def download_project():
    """data_url (Curlコマンド) を実行し、結果をダウンロードファイルとして返す。"""
    
    # クエリパラメータから data_url を取得
    data_url = request.args.get('data_url')
    print(f"data_url (Curl実行リンク):{data_url}")
    
    if not data_url:
        return "エラー: ダウンロードURLが指定されていません。", 400
    
    # Curlコマンドを実行するリンクへアクセス (つまり、プロジェクトファイルを取得)
    curl_command_url = data_url
    print(f"Curl実行: curl -v -L {curl_command_url}") # ログ出力

    try:
        # data_url (外部Curl実行サービス) へリクエストを送信
        # これにより、外部サービスが Scratch プロジェクトファイルを取得し、その内容を返します。
        dl_response = requests.get(curl_command_url, stream=True)
        dl_response.raise_for_status()
        
        # 取得したデータをバイトストリームとして扱う
        file_data = io.BytesIO(dl_response.content)
        
        # プロジェクトIDと拡張子を付けてファイル名を決定
        # プロジェクトIDは data_url からも抽出可能
        import re
        match = re.search(r'projects\.scratch\.mit\.edu/(\d+)', data_url)
        project_id = match.group(1) if match else "unknown"
        filename = f"{project_id}.sb3"
        print(f"ダウンロードファイル名:{filename}")
        
        # ファイルとしてユーザーに送り返す (ダウンロードを強制)
        # Content-Dispositionでダウンロードを指示
        return send_file(
            file_data,
            mimetype="application/x.scratch.sb3",
            as_attachment=True,
            download_name=filename
        )

    except requests.exceptions.RequestException as e:
        error_message = f"プロジェクトファイル取得中にエラーが発生しました: {e}"
        print(f"エラー:{error_message}")
        return f"プロジェクトファイルのダウンロードに失敗しました。トークンの有効期限を確認してください。エラー: {e}", 500

print(f"Flask Route: /dl (ダウンロード) を定義しました。")
print("\n" + "="*40)
print("✨ Flaskアプリの構築完了 ✨")
print("="*40)





@app.route('/mqo', methods=['GET', 'POST']) 
def mqo_converter():
    if request.method == 'POST':
        # --- POST処理（ファイルアップロードと変換）---
        file = request.files.get('file')
        if not file or file.filename == '':
            return 'ファイルが選択されていません', 400

        if file.filename.lower().endswith('.mqo'):
            # ファイルの内容をメモリに読み込み（Shift_JIS と UTF-8 の両方に対応）
            try:
                mqo_content = file.read().decode('shift_jis')
            except UnicodeDecodeError:
                file.seek(0) 
                try:
                    mqo_content = file.read().decode('utf-8')
                except Exception as e:
                    return 'ファイルの読み込みエラー: サポートされていない文字コードです', 500
            
            base_name = os.path.splitext(file.filename)[0]
            
            # MQO解析とOBJ/MTL変換を実行
            try:
                # OBJとMTLの2つの文字列を受け取る
                obj_data, mtl_data = mqo_to_obj_and_mtl(mqo_content, base_name) 
            except Exception as e:
                print(f"MQOパーサー内部エラー（最終版）: {e}")
                return f'サーバー内部エラーが発生しました。エラーログを確認してください。', 500

            # 変換結果をZIPファイルとしてまとめてダウンロードさせる (OBJとMTLを同梱)
            from zipfile import ZipFile
            temp_zip = BytesIO()
            with ZipFile(temp_zip, 'w') as zf:
                # 1. OBJファイルをZIPに追加
                zf.writestr(f"{base_name}.obj", obj_data)
                # 2. MTLファイルをZIPに追加
                zf.writestr(f"{base_name}.mtl", mtl_data)

            temp_zip.seek(0)
            
            download_name = f"{base_name}_model.zip"
            
            # ZIPファイルをダウンロードさせる
            return send_file(
                temp_zip,
                mimetype='application/zip',
                as_attachment=True,
                download_name=download_name
            )
        
        return 'MQOファイルを選択してください', 400

    return render_template('mqo.html')
    
# Wasmファイルアップロード用画面
@app.route('/wasm', methods=['GET'])
def wasm_upload_form():
    """Wasmファイルのアップロード/URL指定フォームを表示する (簡易HTML)"""
    html_form = """
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <title>Wasm言語解析ツール</title>
        <style>body { font-family: sans-serif; }</style>
    </head>
    <body>
        <h1>Wasm言語解析ツール 🔍</h1>
        <p>Wasmバイナリをアップロードするか、URLを指定して、元の言語候補を推測します。</p>
        
        <h2>ファイルアップロード (POST /analyze)</h2>
        <form method="POST" action="/analyze" enctype="multipart/form-data">
            <input type="file" name="file" accept=".wasm" required>
            <input type="submit" value="解析開始 (ファイル)">
        </form>
        
        <hr>
        
        <h2>URL指定 (GET /analyze?link=...)</h2>
        <form method="GET" action="/analyze">
            <input type="url" name="link" placeholder="WasmファイルのURLを入力" required style="width: 300px;">
            <input type="submit" value="解析開始 (URL)">
        </form>
        
        <p>結果はJSON形式で表示されます。</p>
    </body>
    </html>
    """
    return render_template_string(html_form)


# 解析エンドポイント：GET (URL) と POST (ファイル) に対応
@app.route('/analyze', methods=['GET', 'POST'])
def analyze():
    wasm_data = None
    
    # 1. GETリクエストの処理 (?link=URL の場合)
    if request.method == 'GET':
        url = request.args.get('link')
        if not url:
            return jsonify({"error": "GETリクエストの場合、?link=URL パラメータが必要です。"}), 400
        
        data_or_error = fetch_wasm_from_url(url)
        if isinstance(data_or_error, dict) and 'error' in data_or_error:
            # URL取得エラー
            return jsonify(data_or_error), 400
        
        wasm_data = data_or_error
        
    # 2. POSTリクエストの処理 (ファイルアップロードの場合)
    elif request.method == 'POST':
        if 'file' not in request.files or request.files['file'].filename == '':
            return jsonify({"error": "ファイルがアップロードされていません。"}), 400
            
        file = request.files['file']
        wasm_data = file.read()
    
    # 3. Wasmデータの解析
    if wasm_data:
        # Wasm解析ロジックの呼び出し
        analysis_result = analyze_wasm_module(wasm_data)
        
        # データの追加情報
        analysis_result["source_type"] = "URL" if request.method == 'GET' else "File Upload"
        analysis_result["size_bytes"] = len(wasm_data)
        
        # 結果をJSONで返却
        return jsonify(analysis_result)
        
    return jsonify({"error": "処理できないリクエストです。"}), 400


    # --- データをロードするAPI ---
@app.route('/api/load_backup/<string:username>', methods=['GET'])
def load_backup(username):
    """GitHubからセーブデータを取得し、返すAPI"""
    github_url = _get_github_api_url(username)
    print(f"API: load_backup for user {username}")

    try:
        content_info = _get_content_info(github_url)
        
        if content_info is None:
            # ファイルが存在しない場合は、新規作成として空のデータを返す
            return jsonify({"status": "success", "data": {}, "message": f"New save file created for {username}."}), 200
        
        # Base64デコード
        encoded_content = content_info['content']
        decoded_content = base64.b64decode(encoded_content).decode('utf-8')
        save_data = json.loads(decoded_content)
        
        return jsonify({"status": "success", "data": save_data}), 200

    except requests.exceptions.RequestException as e:
        print(f"Error loading backup: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# --- データを保存するAPI ---
@app.route('/api/save_backup/<string:username>', methods=['POST'])
def save_backup(username):
    """フロントエンドからセーブデータを受け取り、GitHubにコミットするAPI"""
    github_url = _get_github_api_url(username)
    print(f"API: save_backup for user {username}")
    
    data_to_save = request.json.get('save_data', {})
    
    # 1. データをJSON化し、Base64エンコード
    # 📝 バックスラッシュを含むJSON記号はそのままにして欲しいという要望を尊重
    json_data = json.dumps(data_to_save, indent=2, ensure_ascii=False) 
    encoded_content = base64.b64encode(json_data.encode('utf-8')).decode('utf-8')

    # 2. 現在のファイルのSHAを取得 (更新に必要なため)
    current_sha = None
    try:
        content_info = _get_content_info(github_url)
        if content_info:
            current_sha = content_info.get('sha')
    except requests.exceptions.RequestException as e:
        return jsonify({"status": "error", "message": "Failed to check existing file."}), 500

    # 3. GitHub Contents APIへのペイロードを作成
    payload = {
        "message": f"Backup save data for user {username} (from Vercel API)",
        "content": encoded_content,
        "sha": current_sha # 更新の場合は必須
    }

    # 4. GitHubにPUTリクエストでコミット
    try:
        response = requests.put(github_url, headers=HEADERS, data=json.dumps(payload))
        response.raise_for_status() 
        
        return jsonify({"status": "success", "message": f"Backup successful for {username}!"}), 200
    
    except requests.exceptions.RequestException as e:
        print(f"Error saving backup: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ----------------------------------------------------------------------
# 3. SocketIO (WebSocket) イベントハンドラ
# ----------------------------------------------------------------------

# クライアントが接続したときのイベント
@socketio.on('connect')
def handle_connect():
    print('Client connected:', request.sid)
    # ここで接続ユーザーに「ようこそ」メッセージなどを送信できます
    # emit('system_message', {'data': 'Welcome!'}, room=request.sid)

# クライアントが切断したときのイベント
@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected:', request.sid)

# 'send_message' という名前のカスタムイベントを受信したときのイベント
# TurboWarpのJS拡張機能側から、このイベント名でデータを送ります。
@socketio.on('send_message')
def handle_chat_message(data):
    # data はクライアントから送られてきた辞書型データ（例: {'user': 'カカオマメ', 'text': 'Hello'}）
    
    # Pythonのコンソールに出力して確認
    user = data.get('user', 'Unknown')
    text = data.get('text', 'No Text')
    print(f"[{user}]: {text}")
    
    # 受け取ったメッセージを、接続している他の全てのクライアントにブロードキャスト（送信）する
    # 'new_message' というイベント名で、元のデータを送信します。
    # この 'new_message' をTurboWarp側で受け取ります。
    socketio.emit('new_message', data, broadcast=True)


# --- データ取得元APIの情報 ---
EXTERNAL_API_URL = 'https://go-friend.com/wp-content/themes/simplicity2-child/map/map_json.php'
# 認証クッキーのテンプレート
COOKIE_TEMPLATE = 'PHPSESSID=test_session_id; pmu_id={pm_id}'
# --- ---------------------- ---

# ズームレベルに応じた緯度・経度の「変化量」を定義（簡易的な計算）
# ズームが小さいほど（遠景）、範囲が広くなる。
ZOOM_DELTA = {
    12: 0.2,   # 広範囲
    13: 0.1,
    14: 0.05,
    15: 0.02,   # 標準的な範囲
    16: 0.01,
    17: 0.005,  # 狭い範囲
    18: 0.002
}

def calculate_bounds(lat, lng, zoom):
    """
    中心座標とズームレベルから、簡易的な境界ボックス座標を計算する。
    """
    # ズームレベルに対応する変化量を取得。デフォルトは15の時の値を使用
    delta = ZOOM_DELTA.get(zoom, ZOOM_DELTA[15])
    print(f"delta:{delta}") # 値を出力

    # 南西 (SW) の座標
    maxswla = lat - delta
    maxswln = lng - delta

    # 北東 (NE) の座標
    maxnela = lat + delta
    maxneln = lng + delta
    
    # 計算結果を辞書で返す
    bounds = {
        'maxswla': maxswla,
        'maxswln': maxswln,
        'maxnela': maxnela,
        'maxneln': maxneln
    }
    print(f"calculated_bounds:{bounds}") # 値を出力
    return bounds


@app.route('/api/listget', methods=['GET'])
def proxy_listget():
    """
    中心座標(lat, lng)とズームレベル(zoom)を受け取り、
    リスト取得(type=listget)リクエストを実行するプロキシエンドポイント。
    """
    params = request.args # GETリクエストのクエリパラメータを取得

    # --- 1. ユーザーからの必須パラメータの取得 ---
    
    try:
        center_lat = float(params.get('lat'))
        center_lng = float(params.get('lng'))
        zoom_level = int(params.get('zoom', 15)) # zoomがなければデフォルト15
    except (TypeError, ValueError):
        return Response(
            json.dumps({"error": "必須パラメータ(lat, lng, zoom)が不正です。"}), 
            status=400, 
            content_type='application/json'
        )

    # 認証情報の設定 (ユーザーIDはデフォルト値またはパラメータから取得)
    pm_id = params.get('pmu_id', '4826388')
    version = params.get('v', '433')
    
    print(f"center_lat:{center_lat}") # 値を出力
    print(f"center_lng:{center_lng}") # 値を出力
    print(f"zoom_level:{zoom_level}") # 値を出力


    # --- 2. 境界ボックスの計算 ---
    
    bounds = calculate_bounds(center_lat, center_lng, zoom_level)

    # --- 3. 外部APIへ送るPOSTデータの準備 ---
    
    # listgetに必要な全てのパラメータを結合
    external_data = {
        'type': 'listget',
        'zoom': zoom_level,
        'version': version,
        'pmu_id': pm_id,
        # 計算された境界ボックスの座標を追加
        **bounds 
        # ここにフィルタリング情報（pm_typeのON/OFFなど）が追加される
    }
    encoded_data = urllib.parse.urlencode(external_data).encode('utf-8')
    print(f"encoded_data:{encoded_data}") # 値を出力
    
    # --- 4. 外部APIへのリクエスト実行（urllib.requestを使用） ---
    
    cookie_header = COOKIE_TEMPLATE.format(pm_id=pm_id)
    print(f"cookie_header:{cookie_header}") # 値を出力
    
    try:
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie_header,
            'User-Agent': 'Mozilla/5.0 (Custom Flask Proxy)',
            'Content-Length': len(encoded_data)
        }
        
        req = urllib.request.Request(
            url=EXTERNAL_API_URL, 
            data=encoded_data, 
            headers=headers, 
            method='POST'
        )
        
        with urllib.request.urlopen(req) as response:
            external_response_data = response.read()
            status_code = response.getcode()
            content_type = response.info().get('Content-Type')
            
            # 応答をそのままクライアントに返す
            return Response(
                external_response_data, 
                status=status_code, 
                content_type=content_type
            )

    except urllib.error.URLError as e:
        error_message = f"外部APIアクセスエラー: {e.reason}"
        return Response(json.dumps({"error": error_message}), status=500, content_type='application/json')
    except Exception as e:
        error_message = f"予期せぬエラー: {str(e)}"
        return Response(json.dumps({"error": error_message}), status=500, content_type='application/json')



# 🚨 環境変数を設定してください
# Vercelのプロジェクト設定でこの変数を定義する必要があります
RENDER_URL = os.environ.get("RENDER_URL", "https://rei-1.onrender.com")




@app.route('/wasm2', methods=['GET'])
def wasm():
    """最初のURL入力フォームを表示"""
    return render_template('wasm.html')

## =========================================================
## 2. Render コンパイラへのプロキシ API ルート
## =========================================================

# @app.route('/api/compile', methods=['POST'])
# def compile_proxy_curl():
#     """
#     ⚠️ curl を使用するプロキシエンドポイント (非推奨)
#     """
#     try:
#         data = flask.request.get_json()
#         rust_code = data.get('code')
        
#         # ユーザー入力を直接含むため、セキュリティに注意が必要
#         json_payload = json.dumps({'code': rust_code})
        
#         command = [
#             'curl', '-s', '-X', 'POST', 
#             '-H', 'Content-Type: application/json',
#             # -d にペイロードを渡す
#             '-d', json_payload, 
#             f'{RENDER_URL}/api/compile'
#         ]
#         
#         process = subprocess.run(command, capture_output=True, text=True, timeout=60)
#         
#         if process.returncode != 0:
#             # curl自体が失敗、または Renderがエラーを返した場合
#             return flask.jsonify({'status': 'error', 'message': 'Render compilation failed (cURL error)'}), 500
# 
#         render_response = json.loads(process.stdout)
#         return flask.jsonify(render_response), 200
# 
#     except Exception as e:
#         print(f"Compilation Proxy Error (cURL): {e}")
#         return flask.jsonify({'status': 'error', 'message': f'Proxy Error: {e}'}), 500

@app.route('/api/compile', methods=['POST'])
def compile_proxy_requests():
    """
    ✅ requests を使用するプロキシエンドポイント (推奨)
    """
    try:
        # クライアントから送信されたRustコードを取得
        rust_code = flask.request.get_json().get('code')
        
        # Renderコンパイラサーバーにコードを転送
        render_response = requests.post(
            f"{RENDER_URL}/api/compile",
            json={'code': rust_code},
            timeout=30 
        )
        
        # Renderからの応答をそのままクライアントに返す
        # Content-Typeをapplication/jsonに設定し、レスポンスを返す
        return flask.Response(
            response=render_response.text,
            status=render_response.status_code,
            mimetype='application/json'
        )

    except requests.exceptions.RequestException as e:
        print(f"Error communicating with Render: {e}")
        return flask.jsonify({'status': 'error', 'message': 'Compiler service (Render) is unavailable.'}), 503
    except Exception as e:
        print(f"Vercel internal error: {e}")
        return flask.jsonify({'status': 'error', 'message': f'Internal Proxy Error: {e}'}), 500


@app.route('/api/status', methods=['GET'])
def status_proxy():
    """
    進捗ポーリングのためのプロキシエンドポイント
    """
    task_id = flask.request.args.get('id')
    if not task_id:
        return flask.jsonify({'error': 'Missing task_id'}), 400

    try:
        # Renderのステータスエンドポイントに問い合わせ
        render_response = requests.get(
            f"{RENDER_URL}/api/status/{task_id}",
            timeout=10
        )
        
        # Renderからの応答をそのままクライアントに中継
        return flask.Response(
            response=render_response.text,
            status=render_response.status_code,
            mimetype='application/json'
        )

    except requests.exceptions.RequestException as e:
        print(f"Status Proxy Error: {e}")
        return flask.jsonify({'status': 'error', 'message': 'Status service unavailable.'}), 503
    except Exception as e:
        print(f"Internal Status Error: {e}")
        return flask.jsonify({'status': 'error', 'message': 'Internal Error'}), 500
    
## =========================================================
## 3. ダウンロードプロキシ (ZIPファイルを中継)
## =========================================================

@app.route('/api/download/<task_id>', methods=['GET'])
def download_proxy(task_id):
    """
    RenderからのZIPファイルダウンロードを中継するエンドポイント
    """
    if not task_id:
        return flask.jsonify({'error': 'Missing task_id'}), 400

    try:
        # Renderのダウンロードエンドポイントに問い合わせ (ストリーミング推奨だが、ここではrequestsを使用)
        render_response = requests.get(
            f"{RENDER_URL}/api/download/{task_id}",
            stream=True, # ストリーミングを有効に
            timeout=120
        )

        if render_response.status_code != 200:
             # Renderからのエラー応答をそのまま返す
            return flask.Response(
                response=render_response.text,
                status=render_response.status_code,
                mimetype='application/json'
            )

        # 成功の場合、ZIPファイルをストリーミングで中継する
        response = flask.Response(
            flask.stream_with_context(render_response.iter_content(chunk_size=8192)),
            content_type=render_response.headers['Content-Type']
        )
        
        # ファイル名ヘッダーをRenderから受け継ぐ
        download_name = render_response.headers.get('Content-Disposition', f'attachment; filename="wasm_package_{task_id}.zip"')
        response.headers['Content-Disposition'] = download_name
        
        return response

    except requests.exceptions.RequestException as e:
        print(f"Download Proxy Error: {e}")
        return flask.jsonify({'status': 'error', 'message': 'Download service unavailable.'}), 503
    except Exception as e:
        print(f"Internal Download Error: {e}")
        return flask.jsonify({'status': 'error', 'message': 'Internal Error'}), 500






if __name__ == '__main__':
    print(" デバッグモードは開発用です。本番環境では絶対に有効にしないでください。")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
