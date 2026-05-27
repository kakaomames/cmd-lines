import trimesh
import os
import pymeshlab

def convert_obj_to_3mf(obj_file_path, file_path_3mf):
    print(f"[LOG] trimesh変換処理を開始します: {obj_file_path}")
    
    # ファイルの存在チェック
    if not os.path.exists(obj_file_path):
        print(f"[LOG] エラー: 入力ファイルが見つかりません: {obj_file_path}")
        return False
        
    try:
        # OBJファイルの読み込み
        print("[LOG] [trimesh] OBJファイルを読み込み中...")
        mesh = trimesh.load(obj_file_path)
        
        # 3MF形式でエクスポート
        print(f"[LOG] [trimesh] 3MFファイルを出力中: {file_path_3mf}")
        mesh.export(file_path_3mf, file_type='3mf')
        
        print("[LOG] [trimesh] 変換が正常に完了しました！✨")
        return True
        
    except Exception as e:
        print(f"[LOG] [trimesh] 変換中にエラーが発生しました: {str(e)}")
        return False

def ms(obj_file_path, file_path_3mf):
    print(f"[LOG] PyMeshLab変換処理を開始します: {obj_file_path}")
    
    # ファイルの存在チェック
    if not os.path.exists(obj_file_path):
        print(f"[LOG] エラー: 入力ファイルが見つかりません: {obj_file_path}")
        return False
        
    try:
        print("[LOG] [PyMeshLab] MeshSetを初期化中...")
        mesh_set = pymeshlab.MeshSet()
        
        print(f"[LOG] [PyMeshLab] OBJファイルをロード中: {obj_file_path}")
        mesh_set.load_new_mesh(obj_file_path)
        
        print(f"[LOG] [PyMeshLab] 3MFファイルを保存中: {file_path_3mf}")
        mesh_set.save_current_mesh(file_path_3mf)
        
        print("[LOG] [PyMeshLab] PyMeshLabによる変換が完了しました。✨")
        return True
        
    except Exception as e:
        print(f"[LOG] [PyMeshLab] 変換中にエラーが発生しました: {str(e)}")
        return False

# 単体で実行された場合のテスト動作
if __name__ == "__main__":
    input_obj = "model.obj"
    output_3mf_trimesh = "models_trimesh.3mf"
    output_3mf_meshlab = "models_meshlab.3mf"
    
    print(f"[LOG] 単体テスト実行 - 入力: {input_obj}")
    convert_obj_to_3mf(input_obj, output_3mf_trimesh)
    ms(input_obj, output_3mf_meshlab)
