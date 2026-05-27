import trimesh
import os

def convert_obj_to_3mf(obj_file_path, file_path_3mf):
    print(f"[LOG] trimesh変換処理を開始します: {obj_file_path}")
    
    if not os.path.exists(obj_file_path):
        print(f"[LOG] エラー: 入力ファイルが見つかりません: {obj_file_path}")
        return False
        
    try:
        print("[LOG] [trimesh] OBJファイルを読み込み中...")
        mesh = trimesh.load(obj_file_path)
        
        print(f"[LOG] [trimesh] 3MFファイルを出力中: {file_path_3mf}")
        mesh.export(file_path_3mf, file_type='3mf')
        
        print("[LOG] [trimesh] 変換が正常に完了しました！✨")
        return True
        
    except Exception as e:
        print(f"[LOG] [trimesh] 変換中にエラーが発生しました: {str(e)}")
        return False

def ms(obj_file_path, file_path_3mf):
    print(f"[LOG] クラウド環境のため、PyMeshLabの代わりにtrimeshで代替処理を実行します: {obj_file_path}")
    return convert_obj_to_3mf(obj_file_path, file_path_3mf)

if __name__ == "__main__":
    # 単体テスト用ロジック（構文エラーを完全に解消）
    input_obj = "model.obj"
    output_3mf = "models_test.3mf"
    print(f"[LOG] 単体テスト実行 - 入力: {input_obj}")
    convert_obj_to_3mf(input_obj, output_3mf)
