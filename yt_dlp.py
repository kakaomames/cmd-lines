
import json
from datetime import datetime
# 要求.txtに追加した本物の yt-dlp をインポート！
import yt_dlp

def mission_log(log_type, message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"{timestamp} [{log_type}] {message}")

def yt_dlp_p(target_url):
    """
    本物の yt-dlp ライブラリを使用して動画情報を調査するユニット
    """
    mission_log("ACTION", f"yt-dlpユニット起動: 対象URLの解析を開始します -> {target_url}")
    
    # yt-dlp のオプション設定（ここではダウンロードせずに情報抽出のみの軽量モード）
    ydl_opts = {
        'simulate': True,            # 実際の動画ファイルダウンロードは行わない設定
        'skip_download': True,       # 情報を抜くだけなので高速
        'quiet': True,               # 標準出力を抑えて我々のmission_logを目立たせる
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # 動画情報の抽出実行
            info_dict = ydl.extract_info(target_url, download=False)
            
            # 必要な値を抽出
            video_title = info_dict.get('title', 'Unknown Title')
            video_id = info_dict.get('id', 'Unknown ID')
            uploader = info_dict.get('uploader', 'Unknown Uploader')
            
            # 値が取得できた（変わった）ので、ミッションログに詳細を出力！
            mission_log("ACTION", f"動画解析成功！ [ID: {video_id}] [タイトル: {video_title}] [投稿者: {uploader}]")
            
            # 部隊のJSONルール：バックスラッシュ記号やエスケープ、URL内のスラッシュなどをそのまま残す構造体を作成
            result_data = {
                "status": "success",
                "video_id": video_id,
                "title": video_title,
                "uploader": uploader,
                "fetched_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "sample_escaped_path": "downloads\\youtube\\" + video_id  # バックスラッシュ維持の検証用
            }
            
            return result_data

    except Exception as e:
        # 万が一解析に失敗した場合もログに記録！
        mission_log("ERROR", f"yt-dlpでの動画解析中にエラーが発生したぞ：{str(e)}")
        return {
            "status": "error",
            "reason": str(e)
        }
