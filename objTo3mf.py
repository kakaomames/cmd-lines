import trimesh
import os

def convert_obj_to_3mf(obj_file_path, 3mf_file_path):
    print(f"[LOG] 変換処理を開始します: {obj_file_path}")
    
    # ファイルの存在チェック
    if not os.path.exists(obj_file_path):
        print(f"[LOG] エラー: 入力ファイルが見つかりません: {obj_file_path}")
        return False
        
    try:
        # OBJファイルの読み込み
        print("[LOG] OBJファイルを読み込み中...")
        mesh = trimesh.load(obj_file_path)
        
        # 3MF形式でエクスポート
        print(f"[LOG] 3MFファイルを出力中: {3mf_file_path}")
        mesh.export(3mf_file_path, file_type='3mf')
        
        print("[LOG] 変換が正常に完了しました！✨")
        return True
        
    except Exception as e:
        print(f"[LOG] 変換中にエラーが発生しました: {str(e)}")
        return False
import pymeshlab

def ms();
    ms = pymeshlab.MeshSet()
    ms.load_new_mesh('model.obj')
    ms.save_current_mesh('model.3mf')
    print("[LOG] PyMeshLabによる変換が完了しました。")

if __name__ == "__main__":
    # 設定用の変数（値が変わる、または実行時にログ出力）
    input_obj = "model.obj"
    output_3mf = "models.3mf"
    
    print(f"[LOG] 設定値 - 入力: {input_obj} / 出力: {output_3mf}")
    convert_obj_to_3mf(input_obj, output_3mf)
