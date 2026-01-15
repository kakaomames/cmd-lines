#include <emscripten.h>
#include <math.h>

extern "C" {
    // 1. 基本の二乗計算（動作確認用）
    EMSCRIPTEN_KEEPALIVE
    int square(int x) {
        return x * x;
    }

    // 2. 距離の計算（マイクラやポケモンの座標計算に便利！）
    // 平面上の2点間の距離を求めるぞ
    EMSCRIPTEN_KEEPALIVE
    float get_distance(float x1, float y1, float x2, float y2) {
        float dx = x2 - x1;
        float dy = y2 - y1;
        return sqrt(dx * dx + dy * dy);
    }

    // 3. 経験値からレベルを計算するようなロジック（ゲーム用！）
    EMSCRIPTEN_KEEPALIVE
    int calc_level(int exp) {
        if (exp < 0) return 0;
        return (int)sqrt(exp / 10);
    }
}