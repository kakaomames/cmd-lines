# app.py から app インスタンスをインポートする
from app import app
d
# Vercel 用のハンドラ
# (直接 app を公開するだけでVercelはFlaskとして認識してくれる)
if __name__ == '__main__':
    app.run()
