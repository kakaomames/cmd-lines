# mqo_parser.py (最終修正版)
# mqo_parser.py (超デバッグログ版)
import math
print(f"import math: {math}") 

def mqo_to_obj(mqo_content, base_name):
    print(f"--- mqo_to_obj 関数開始 ---")
    
    mqo_content = mqo_content.replace('\r\n', '\n')
    print(f"改行コードを統一しました!")
    
    vertices = []
    print(f"verticesリストを初期化しました! vertices:{vertices}")
    faces = []
    print(f"facesリストを初期化しました! faces:{faces}")
    
    in_vertex_data = False
    print(f"in_vertex_data:{in_vertex_data}")
    in_face_data = False
    print(f"in_face_data:{in_face_data}")
    
    # ファイルを行ごとに解析
    for line in mqo_content.split('\n'):
        line = line.strip()
        print(f"改行しました! (line.strip()実行: {line[:50]}...)") # 行の先頭50文字を出力

        # 空行とコメントはスキップ
        if not line or line.startswith('#'):
            print(f"空行またはコメントをスキップしました!")
            continue
        
        # --- チャンクの開始/終了の検出と状態遷移 ---
        
        if line.startswith('vertex'):
            in_vertex_data = True
            print(f"in_vertex_data:{in_vertex_data}")
            in_face_data = False 
            print(f"in_face_data:{in_face_data}")
            print(f"vertexブロックの開始を検出しました!")
            continue
        
        elif line.startswith('face'):
            in_vertex_data = False 
            print(f"in_vertex_data:{in_vertex_data}")
            in_face_data = True
            print(f"in_face_data:{in_face_data}")
            print(f"faceブロックの開始を検出しました!")
            continue
        
        elif line == '}':
            in_vertex_data = False
            print(f"in_vertex_data:{in_vertex_data}")
            in_face_data = False
            print(f"in_face_data:{in_face_data}")
            print(f"チャンク終了 '}}' を検出しました!")
            continue

        # --- データの抽出 ---
        
        # 頂点データの抽出 (v)
        if in_vertex_data and len(line) > 0 and line[0].isdigit(): 
            print(f"頂点データ行を処理中: {line[:20]}...")
            try:
                coords = line.split()[:3]
                print(f"coordsを分割しました: {coords}")
                if len(coords) >= 3:
                    x = float(coords[0])
                    print(f"x:{x}")
                    y = float(coords[1])
                    print(f"y:{y}")
                    z = float(coords[2])
                    print(f"z:{z}")
                    
                    if math.isfinite(x) and math.isfinite(y) and math.isfinite(z):
                         vertices.append((x, y, z))
                         print(f"頂点をverticesに追加しました! (現在数: {len(vertices)})")
                    else:
                         print(f"警告: 無効な座標値 (Inf/NaN) を検出しました。スキップします。")
                    
            except ValueError:
                print(f"ValueErrorをキャッチしました! この行をスキップします。")
                continue
            
        # 面データの抽出 (f)
        elif in_face_data and len(line) > 0 and line[0].isdigit():
            print(f"面データ行を処理中: {line[:50]}...")
            v_index_start = line.find('V(')
            print(f"v_index_start:{v_index_start}")
            
            if v_index_start != -1: 
                v_index_end = line.find(')', v_index_start)
                print(f"v_index_end:{v_index_end}")
                
                if v_index_end != -1:
                    v_indices_str = line[v_index_start + 2:v_index_end].strip()
                    print(f"v_indices_str:{v_indices_str}")
                    
                    if v_indices_str:
                        v_indices = v_indices_str.split()
                        print(f"v_indicesを分割しました: {v_indices}")
                        
                        try:
                            # OBJは1-based indexなので、+1
                            face_indices = [str(int(i) + 1) for i in v_indices]
                            print(f"face_indicesを変換しました: {face_indices}")
                            faces.append(face_indices)
                            print(f"面をfacesに追加しました! (現在数: {len(faces)})")
                        except ValueError:
                            print(f"ValueErrorをキャッチしました! 不正な面データです。スキップします。")
                            continue
                else:
                    print(f"V(の閉じ括弧 ')' が見つかりませんでした。スキップします。")
            else:
                print(f"面データ行でしたが 'V(' が見つかりませんでした。スキップします。")
        
        else:
             print("改行しました!") # アクションがない時のプリント
    
    # --- OBJ形式の文字列を構築 ---
    print(f"OBJ出力文字列の構築開始...")
    obj_output = f"# Converted from MQO by Flask App\n"
    print(f"obj_outputにヘッダーを追加しました。")
    
    obj_output += f"o {base_name}_mesh\n" 
    print(f"obj_outputにオブジェクト宣言を追加しました。")
    
    obj_output += "\n# Vertices\n"
    print(f"頂点ヘッダーを追加しました。")
    for v in vertices:
        obj_output += f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n"
    print(f"全頂点 ({len(vertices)}個) の出力を完了しました。")

    obj_output += "\n# Faces (v index only)\n"
    print(f"面ヘッダーを追加しました。")
    for f in faces:
        obj_output += f"f {' '.join(f)}\n"
    print(f"全面 ({len(faces)}個) の出力を完了しました。")
        
    print(f"抽出された頂点数: {len(vertices)}")
    print(f"抽出された面数: {len(faces)}")
    
    print(f"--- mqo_to_obj 関数終了 ---")
    return obj_output

if __name__ == '__main__':
    # 【重要】デバッグモードをON
    app.run(debug=True)
