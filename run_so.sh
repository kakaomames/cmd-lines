cd ./
clang -shared -fPIC stub.c -o libstub.so
ls -l libstub.so

# ==============================================================================
echo "🪪 作戦バージョン: v7.3.3 - リンカー自動結合シェル"
# ==============================================================================

echo "[*] 🗺️ システムリンカーの隠れみのルート（LD_LIBRARY_PATH）を展開中..."
# カレントディレクトリ(.)をライブラリ検索の最優先ルートに指定！
export LD_LIBRARY_PATH=.:$LD_LIBRARY_PATH

echo "[*] 🛠️  libstub.so の再コンパイルを実行します..."
gcc -shared -o libstub.so stub.c -fPIC

echo "[+] 🚀 準備完了。一斉進軍アタックを開始します！！！"


echo ""
# echo "cd /storage/emulated/0/ && cp /storage/emulated/0/run_so.sh ~/we_so_test && cp /storage/emulated/0/run_so.py ~/we_so_test && cd ~/we_so_test && python run_so.pyを実行しました"
echo ""
echo ""
# python run_so.py
