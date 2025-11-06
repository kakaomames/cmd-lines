# mqo_parser.py (最終修正版)
import math
# math: 浮動小数点数が有効な値かチェックするために必要
print(f"math:{math}") 

def mqo_to_obj(mqo_content, base_name):
    """
    MQOファイルの内容を解析し、OBJ形式の文字列に変換します。

    Args:
        mqo_content (str): MQOファイルの内容全体。
        base_name (str): 元ファイル名（拡張子なし）。
    """
    # 処理前に改行コードを統一
    mqo_content = mqo_content.replace('\r\n', '\n')
    
    vertices = []
    faces = []
    
    # 解析状態を保持するフラグ
    in_vertex_data = False
    in_face_data = False
    
    for line in mqo_content.split('\n'):
        line = line.strip()
        
        # 空行とコメントはスキップ
        if not line or line.startswith('#'):
            continue
        
        # --- チャンクの開始/終了の検出と状態遷移 ---
        
        # vertexブロックの開始
        if line.startswith('vertex'):
            in_vertex_data = True
            in_face_data = False # 面データ抽出をオフ
            continue
        
        # faceブロックの開始
        elif line.startswith('face'):
            in_vertex_data = False # 頂点データ抽出をオフ
            in_face_data = True
            continue
        
        # チャンクの終了（'}'）
        elif line == '}':
            # ブロックを終了させる（次の行から別のデータやオブジェクトが来る）
            in_vertex_data = False
            in_face_data = False
            continue

        # --- データの抽出 ---
        
        # 頂点データの抽出 (v)
        # 頂点データの行は、数字で始まり、'vertex'などのキーワードを含まない
        if in_vertex_data and line[0].isdigit():
            try:
                coords = line.split()[:3]
                if len(coords) >= 3:
                    x = float(coords[0])
                    y = float(coords[1])
                    z = float(coords[2])
                    
                    # 【重要】無限大や非数 (NaN/Inf) を含む行はスキップ
                    if math.isfinite(x) and math.isfinite(y) and math.isfinite(z):
                         vertices.append((x, y, z))
                    
            except ValueError as e:
                # print(f"頂点データ解析エラーをスキップ: {line}. エラー: {e}")
                continue

        # 面データの抽出 (f)
        # 面データの行は、頂点数を示す数字 ('3', '4'...) で始まる
        elif in_face_data and line[0].isdigit():
            v_index_start = line.find('V(')
            v_index_end = line.find(')', v_index_start)
            
            if v_index_start != -1 and v_index_end != -1:
                # V(...) から "0 1 3 2" を抽出
                v_indices_str = line[v_index_start + 2:v_index_end]
                v_indices = v_indices_str.split()
                
                # 【重要】OBJの面データは1から始まるインデックスなので、+1してリストに追加
                try:
                    face_indices = [str(int(i) + 1) for i in v_indices]
                    faces.append(face_indices)
                except ValueError:
                    continue
    
    # --- OBJ形式の文字列を構築 ---
    obj_output = f"# Converted from MQO by Flask App\n"
    
    # 【必須】Blockbenchにメッシュを認識させるための 'o' (Object) 宣言を追加
    obj_output += f"o {base_name}_mesh\n" 
    
    # 頂点の出力
    obj_output += "\n# Vertices\n"
    for v in vertices:
        obj_output += f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n"

    # 面の出力
    obj_output += "\n# Faces (v index only)\n"
    for f in faces:
        obj_output += f"f {' '.join(f)}\n"
        
    print(f"抽出された頂点数: {len(vertices)}")
    print(f"抽出された面数: {len(faces)}")
    
    return obj_output

# if __name__ == '__main__': ... のテストコードも、返り値に合わせて修正し、面データ抽出が動作するか確認してください
