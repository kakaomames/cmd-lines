#include <stdio.h>
#include <emscripten/emscripten.h>

// これが「_square」として書き出される関数だ！
EMSCRIPTEN_KEEPALIVE
int square(int x) {
    return x * x;
}

int main() {
    printf("👿：こんにちは、世界！WASMエンジン起動成功。\n");
    printf("👿：3の二乗は %d です。\n", square(3));
    return 0;
}