# api/compile.py (Vercel 側の Python ファイル)
import os
import json
import requests
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse

# Render サーバーのコンパイルAPI URLを環境変数から取得
RENDER_COMPILER_URL = os.environ.get('RENDER_COMPILER_URL', 'YOUR_RENDER_URL/api/compile') 

# Vercel のサーバーレス関数エントリポイント
def handler(request):
    """
    クライアントからのPOSTリクエストをRenderサーバーにプロキシ（転送）する。
    """
    if request.method != 'POST':
        return {
            'statusCode': 405,
            'body': 'Method Not Allowed'
        }

    try:
        # クライアントからのJSONペイロードを読み込む
        # (Vercel環境によってリクエストボディの読み取り方が異なる場合があるが、ここでは標準的な想定)
        body = request.get_json() 
    except Exception as e:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON in request body.'})
        }

    # クライアントから送信された全ペイロード（code, cargo_toml, など）をそのままRenderに転送する
    # cargo_toml が含まれていなくても、そのまま転送すれば Render 側で None として処理できる
    transfer_payload = body 
    
    # Render サーバーにリクエストを転送 (プロキシ)
    try:
        render_response = requests.post(
            RENDER_COMPILER_URL,
            json=transfer_payload,
            timeout=55 # Vercel のタイムアウトより短く設定 (例: 60秒より短い55秒)
        )

        # Render からの応答をそのままクライアントに返す
        response_data = render_response.json()
        
        return {
            'statusCode': render_response.status_code,
            'headers': {
                'Content-Type': 'application/json',
                # 必要に応じて CORS ヘッダーを追加
                'Access-Control-Allow-Origin': '*' 
            },
            'body': json.dumps(response_data)
        }

    except requests.exceptions.Timeout:
        return {
            'statusCode': 504,
            'body': json.dumps({'error': 'Render server timed out after Vercel proxying.'})
        }
    except requests.exceptions.RequestException as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Proxy request failed: {str(e)}'})
        }
