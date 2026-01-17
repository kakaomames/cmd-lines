#include <emscripten.h>

extern "C" {
    // 👿 これでJSから "square" という名前で呼べるようになる
    EMSCRIPTEN_KEEPALIVE
    int square(int x) {
        return x * x;
    }
}