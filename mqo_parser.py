# mqo_parser.py

def mqo_to_obj(mqo_content):
    """
    MQO (Metasequoia Document Format Text Ver 1.1) の内容を解析し、
    OBJ形式の文字列に変換します。

    Args:
        mqo_content (str): MQOファイルの内容全体。

    Returns:
        str: OBJファイル形式の文字列。
    """
    mqo_content = mqo_content.replace('\r\n', '\n') # 改行コードを統一
    lines = mqo_content.split('\n')
    
    # 解析で抽出するデータ
    vertices = []  # 頂点データ (v)
    faces = []     # 面データ (f)
    
    # 解析状態を保持するフラグ
    in_object_block = False
    in_vertex_block = False
    in_face_block = False

    print(f"MQOコンテンツの行数: {len(lines)}") # 行数を表示
    
    for line in lines:
        line = line.strip()
        
        # --- Objectブロックの開始と終了を検出 ---
        if line.startswith('Object'):
            # 例: Object "Cube" {
            in_object_block = True
            print(f"Objectブロック開始: {line.split(' ')[1]}") # オブジェクト名を表示
            continue
        
        if in_object_block and line == '}':
            in_object_block = False
            in_vertex_block = False
            in_face_block = False
            continue

        if not in_object_block:
            continue

        # --- Vertexブロックの検出 ---
        if in_object_block and line.startswith('vertex'):
            # 例: Vertex 8 {
            # 次の行から頂点データ
            in_vertex_block = True
            in_face_block = False
            print(f"Vertexブロック開始") # 頂点ブロック開始を表示
            continue

        # --- Faceブロックの検出 ---
        if in_object_block and line.startswith('face'):
            # 例: Face 12 {
            # 次の行から面データ
            in_face_block = True
            in_vertex_block = False
            print(f"Faceブロック開始") # 面ブロック開始を表示
            continue
        
        # --- データの抽出 ---
        if in_vertex_block and line.endswith('{'):
             # Vertexブロックの開始行（例: Vertex 100 {）の次の行から座標が始まります
             continue

        if in_face_block and line.endswith('{'):
            # Faceブロックの開始行（例: Face 200 {）の次の行から面が始まります
            continue

        if in_vertex_block and line.endswith('}'):
            # Vertexブロック終了
            in_vertex_block = False
            continue

        if in_face_block and line.endswith('}'):
            # Faceブロック終了
            in_face_block = False
            continue


        # 頂点データの抽出
        if in_vertex_block and not line.endswith('{') and not line.endswith('}'):
            try:
                # MQOの頂点データは "x y z" の形式
                coords = line.split()
                if len(coords) >= 3:
                    # floatに変換して格納
                    vertices.append((float(coords[0]), float(coords[1]), float(coords[2])))
            except ValueError:
                # 数値変換エラーはスキップ
                continue

        # 面データの抽出
        # 面データは "3 V(1 2 3) M(0) UV(...) N(...)" の形式
        if in_face_block:
            parts = line.split()
            # 最初の要素が頂点数 (3, 4, 5...) の場合
            if parts and parts[0].isdigit():
                num_vertices = int(parts[0])
                
                # V(...) の部分を探す
                v_index_start = line.find('V(')
                v_index_end = line.find(')', v_index_start)
                
                if v_index_start != -1 and v_index_end != -1:
                    # V(1 2 3) から "1 2 3" を抽出
                    v_indices_str = line[v_index_start + 2:v_index_end]
                    v_indices = v_indices_str.split()
                    
                    if len(v_indices) == num_vertices:
                        # MQOのインデックスは1から始まりますが、OBJの面データも1から始まります。
                        # ただし、OBJの面データは「面を構成する頂点」の番号です。
                        # MQOのV(...)のインデックスは「ファイル内の頂点リストのインデックス（0番目から数えて1, 2, 3...）」です。
                        # OBJの面データは「OBJファイル内でvとして出力された頂点の何番目か」です。
                        
                        # MQOのV(i j k)の i, j, k は 0-based indexです。
                        # OBJの f i j k は 1-based indexです。
                        # ここではMQOのインデックスをそのまま利用します。
                        
                        # OBJの面データは1から始まるため、MQOの0-based index (i) に +1 します。
                        # ただし、今回は全ての頂点を一括で出力するため、MQOのV(i j k)は「Objectチャンク内での頂点リストのインデックス」です。
                        # 複数のObjectがある場合、インデックスのオフセット処理が必要になりますが、
                        # 今回は一つのオブジェクト内の頂点インデックスが連続していると仮定し、
                        # シンプルに「元のMQOのインデックス + 1」を面データとします。
                        # (OBJの仕様では頂点番号は「現在までに読み込んだvの通し番号」です)
                        
                        face_indices = [str(int(i) + 1) for i in v_indices]
                        faces.append(face_indices)
                        
    # --- OBJ形式の文字列を構築 ---
    obj_output = "# Converted from MQO by Flask App\n"
    
    # 頂点の出力
    obj_output += "\n# Vertices\n"
    for v in vertices:
        # X, Y, Z
        obj_output += f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n"

    # 面の出力
    obj_output += "\n# Faces (v index only)\n"
    for f in faces:
        # f v1 v2 v3...
        obj_output += f"f {' '.join(f)}\n"
        
    print(f"抽出された頂点数: {len(vertices)}") # 抽出された頂点数を表示
    print(f"抽出された面数: {len(faces)}") # 抽出された面数を表示
    
    return obj_output

if __name__ == '__main__':
    # テスト用
    sample_mqo = """
Metasequoia Document Format Text Ver 1.1
CodePage 932

Material 1 {
    "Default" shader(3) col(0.5 0.5 0.5 1)
}
Object "Cube" {
    vertex 8 {
        -1.000000 1.000000 -1.000000
        1.000000 1.000000 -1.000000
        -1.000000 -1.000000 -1.000000
        1.000000 -1.000000 -1.000000
        -1.000000 1.000000 1.000000
        1.000000 1.000000 1.000000
        -1.000000 -1.000000 1.000000
        1.000000 -1.000000 1.000000
    }
    face 12 {
        4 V(0 1 3 2) M(0) UV(0 0 1 0 1 1 0 1)
        4 V(4 6 7 5) M(0)
        4 V(0 4 5 1) M(0)
        4 V(2 3 7 6) M(0)
        4 V(0 2 6 4) M(0)
        4 V(1 5 7 3) M(0)
    }
}
"""
    obj_result = mqo_to_obj(sample_mqo)
    print(f"OBJ出力の一部:\n{obj_result[:200]}...") # 結果の一部を表示
