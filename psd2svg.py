import os
import sys
import base64
from io import BytesIO
from psd_tools import PSDImage

def psd2svg(psd_path):
    if not os.path.exists(psd_path):
        print(f"エラー: {psd_path} が見つかりません")
        return

    print(f"PSD読み込み中: {psd_path} ...")
    psd = PSDImage.open(psd_path)
    output_dir = "/tmp/" + os.path.splitext(psd_path)[0] + "_svg_layers"
    os.makedirs(output_dir, exist_ok=True)

    print(f"PSD読み込み完了！保存先フォルダ: {output_dir}")

    count = 0
    # 全レイヤーを巡回
    for i, layer in enumerate(psd.descendants()):
        # グループ（フォルダ）や非表示レイヤーはスキップ
        if layer.is_group() or not layer.visible:
            continue
        
        # 重い composite() ではなく Pillow の画像データを直接取得！
        try:
            layer_image = layer.topil()
        except Exception as e:
            continue

        if layer_image is None:
            continue

        # PNGとしてメモリに保存
        buffer = BytesIO()
        layer_image.save(buffer, format="PNG")
        b64_data = base64.b64encode(buffer.getvalue()).decode('utf-8')

        width, height = layer_image.size
        left, top = layer.offset

        # 位置情報(offset)を保持したSVGデータを構築
        svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{psd.width}" height="{psd.height}" viewBox="0 0 {psd.width} {psd.height}">
  <!-- Layer: {layer.name} -->
  <image x="{left}" y="{top}" width="{width}" height="{height}" xlink:href="data:image/png;base64,{b64_data}" />
</svg>'''

        # 安全なファイル名を作成
        safe_name = "".join([c for c in layer.name if c.isalnum() or c in (' ', '_', '-')]).rstrip()
        if not safe_name:
            safe_name = f"layer_{i}"
        
        file_path = os.path.join(output_dir, f"{i:03d}_{safe_name}.svg")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(svg_content)
        
        print(f" └─ [保存完了] {file_path}")
        count += 1

    print(f"\n✨ 作戦完了！合計 {count} 個のレイヤーをSVGとして抽出したぞ！")

if __name__ == "__main__":
    psd_file = sys.argv[1] if len(sys.argv) > 1 else "こいし.psd"
    psd2svg(psd_file)

