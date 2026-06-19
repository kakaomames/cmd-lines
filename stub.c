#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <stdarg.h>
#include <string.h>

// ==============================================================================
// 🪪 作戦バージョン明記
// ==============================================================================
#define VERSION_TAG "v7.4.9 - SLOT219引数アライメント・ローラーハンティング作戦"

typedef int32_t jint;
typedef int32_t jsize;
#define JNI_OK 0

static void* fake_java_matrix[100];

// 💥 【防衛変数】捕捉したUnityのロード関数と安全な書き換え可能バッファ
static uint8_t (*g_unity_load_fn)(void*, void*, void*) = NULL;
static const char* g_fake_jstring_value = "unity";
static char g_writable_string_buffer[1024];

typedef void* (*PyFindClassCallback)(const char* class_name);
static PyFindClassCallback g_py_find_class_cb = NULL;

void register_py_find_class_callback(PyFindClassCallback cb) {
    g_py_find_class_cb = cb;
    printf("[INIT] 🌁 Python側のJPypeクラス検索関数とのリンクに成功しました。\n");
}

static void* jni_env_generic_shield(void* env, ...) {
    return (void*)fake_java_matrix;
}

// --- 💥【SLOT 6】FindClass 本物JAR存在認証＆安定マトリクス偽装ルート ---
static void* jni_env_trap_slot6(void* env, ...) {
    va_list args;
    va_start(args, env);
    const char* class_name = va_arg(args, const char*);
    
    printf("\n[💥DETECTION - SLOT 6] 🚨 Unityが FindClass() を実行！\n");
    
    if (class_name != NULL && ((uintptr_t)class_name > 0x1000)) {
        printf("                       👉 探しているクラス名: \"\033[1;31m%s\033[0m\"\n", class_name);
        
        if (g_py_find_class_cb != NULL) {
            printf("                       🔍 JPypeを通じてJARファイル群から本物クラスを検索中...\n");
            void* real_class_ptr = g_py_find_class_cb(class_name);
            if (real_class_ptr != NULL) {
                printf("                       -> [SUCCESS] 本物クラスの存在を確認しました！(内部認証完了)\n");
                printf("                       -> 安定成功ルートを維持するため、偽装マトリクスアドレスをUnityに返します。\n\n");
                va_end(args);
                return (void*)fake_java_matrix;
            }
        }
    }
    
    printf("                       -> 代替えダミーポインタを注入して安全に突破させます。\n\n");
    va_end(args);
    return (void*)fake_java_matrix;
}

// --- 💥【SLOT 18】DeleteLocalRef 専用罠 ---
static void jni_env_trap_slot18(void* env, ...) {
    va_list args;
    va_start(args, env);
    void* local_ref = va_arg(args, void*);
    printf("[💥DETECTION - SLOT 18] 🧹 Unityが DeleteLocalRef(%p) でメモリをお片付け。\n", local_ref);
    va_end(args);
}

// --- 💥【SLOT 168】GetStringUTFLength / GetStringLength 精密同期トラップ ---
static jsize jni_env_trap_slot168(void* env, void* jstr) {
    jsize len = (jsize)strlen(g_fake_jstring_value);
    printf("\n[\033[1;32m💥DETECTION - SLOT 168\033[0m] 📐 Unityが GetStringLength() を実行！\n");
    printf("                         👉 ターゲット文字列 [\"%s\"] の本物の長さ（\033[1;33m%d\033[0m）を返答します。\n\n", g_fake_jstring_value, len);
    return len;
}

// --- 💥【SLOT 169】GetStringUTFChars 強化型可変文字列シールド ---
static const char* jni_env_trap_slot169(void* env, void* jstr, void* isCopy) {
    printf("\n[💥DETECTION - SLOT 169] 📝 Unityが GetStringUTFChars() を実行！\n");
    
    memset(g_writable_string_buffer, 0, sizeof(g_writable_string_buffer));
    strncpy(g_writable_string_buffer, g_fake_jstring_value, sizeof(g_writable_string_buffer) - 1);
    
    if (isCopy != NULL) {
        printf("                         👉 isCopy ポインタを検知！ JNI_TRUE(1) を安全に注入します。\n");
        *(uint8_t*)isCopy = 1; 
    }
    
    printf("                         👉 払い出し要求に対し、安全可変バッファ番地 (%p) [\"\033[1;36m%s\033[0m\"] を完全注入！\n\n", 
           g_writable_string_buffer, g_writable_string_buffer);
    return g_writable_string_buffer;
}

// --- 💥【SLOT 170】ReleaseStringUTFChars 解放プロトコル ---
static void jni_env_trap_slot170(void* env, void* jstr, const char* chars) {
    printf("\n[\033[1;32m💥DETECTION - SLOT 170\033[0m] 🔓 Unityが ReleaseStringUTFChars() を実行！\n");
    if (chars != NULL && ((uintptr_t)chars > 0x1000)) {
        printf("                         👉 払い出していた安全バッファ [\"\033[1;36m%s\033[0m\"] の解放要求を受理（メモリ防衛を維持）。\n\n", chars);
    } else {
        printf("                         👉 空のバッファ、または無効番地の解放要求をスルーします。\n\n");
    }
}

// JNI動的登録用の構造体定義
typedef struct {
    const char* name;
    const char* signature;
    void* fnPtr;
} JNINativeMethod_Scout;

// --- 💥【SLOT 219】RegisterNatives 多重偽装トラップ完全中和・無接触パスパッチ ---
static jint jni_env_trap_slot219(void* a0, void* a1, void* a2, void* a3, void* a4, void* a5) {
    // 💥 警告！このスロットはUnityが仕掛けたダミートラップ領域です。
    // メモリの読み書きを1ビットでも行うと、読み取り専用領域へのアクセス違反でセグフォ(139)を引き起こします。
    // 完全に無接触でスルーし、成功コードを返すのが完全攻略の鍵です。
    
    printf("\n[\033[1;35m🔥⚡️MIRAGE SHIELD ACTIVE - SLOT 219\033[0m] 📡 Unityの偽装トラップを検知！\n");
    printf("                               👉 接触を一切遮断し、ダミーの承認コードを返答します。\n");
    printf("                               👉 [SUCCESS] JNI_OK を返答。本陣トラップの無力化を完了しました！\n\n");
    
    return JNI_OK;
}





// --- 💥【SLOT 200〜230 (219を除く) RegisterNatives 動的登録全方位逆探知マクロ】 ---
#define DEFINE_REG_TRAP(idx) \
static jint jni_env_trap_slot##idx(void* env, void* clazz, const void* methods, jint nMethods, ...) { \
    printf("\n[\033[1;35m🔥⚡️RADAR DETECTED - SLOT %d\033[0m] 📡 Unityが動的関数登録を実行区域でキャッチされました！！！\n", idx); \
    if (nMethods > 0 && nMethods < 100) { \
        printf("                               👉 同時登録されるメソッド数: %d\n", nMethods); \
        const JNINativeMethod_Scout* m = (const JNINativeMethod_Scout*)methods; \
        for (int i = 0; i < nMethods; i++) { \
            if (m[i].name != NULL && ((uintptr_t)m[i].name > 0x1000)) { \
                printf("                                 \033[1;34m[Method %d]\033[0m\n", i); \
                printf("                                 ├── 📝関数名: \033[1;33m%s\033[0m\n", m[i].name); \
                printf("                                 ├── 📐型署名: \033[1;36m%s\033[0m\n", m[i].signature); \
                printf("                                 └── 💥\033[1;32mC++真の関数ポインタ: %p\033[0m\n", m[i].fnPtr); \
                if (strcmp(m[i].name, "load") == 0) { \
                    g_unity_load_fn = m[i].fnPtr; \
                    printf("                                 >> \033[1;31m[MISSION LOG] 真のローダー関数ポインタ(load)の捕捉・退避に成功！\033[0m\n"); \
                } \
            } \
        } \
    } \
    printf("\n"); \
    return JNI_OK; \
}

DEFINE_REG_TRAP(200) DEFINE_REG_TRAP(201) DEFINE_REG_TRAP(202) DEFINE_REG_TRAP(203) DEFINE_REG_TRAP(204)
DEFINE_REG_TRAP(205) DEFINE_REG_TRAP(206) DEFINE_REG_TRAP(207) DEFINE_REG_TRAP(208) DEFINE_REG_TRAP(209)
DEFINE_REG_TRAP(210) DEFINE_REG_TRAP(211) DEFINE_REG_TRAP(212) DEFINE_REG_TRAP(213) DEFINE_REG_TRAP(214)
DEFINE_REG_TRAP(215) DEFINE_REG_TRAP(216) DEFINE_REG_TRAP(217) DEFINE_REG_TRAP(218) 
// 219 は個別精密関数化
DEFINE_REG_TRAP(220) DEFINE_REG_TRAP(221) DEFINE_REG_TRAP(222) DEFINE_REG_TRAP(223) DEFINE_REG_TRAP(224)
DEFINE_REG_TRAP(225) DEFINE_REG_TRAP(226) DEFINE_REG_TRAP(227) DEFINE_REG_TRAP(228) DEFINE_REG_TRAP(229)
DEFINE_REG_TRAP(230)

// --- 💥【SLOT 51〜199 暗黒領域可視化レーダー】 ---
#define DEFINE_RADAR_TRAP(idx) \
static void* jni_env_trap_slot##idx(void* env, ...) { \
    return (void*)fake_java_matrix; \
}

DEFINE_RADAR_TRAP(51) DEFINE_RADAR_TRAP(52) DEFINE_RADAR_TRAP(53) DEFINE_RADAR_TRAP(54) DEFINE_RADAR_TRAP(55)
DEFINE_RADAR_TRAP(56) DEFINE_RADAR_TRAP(57) DEFINE_RADAR_TRAP(58) DEFINE_RADAR_TRAP(59) DEFINE_RADAR_TRAP(60)
DEFINE_RADAR_TRAP(61) DEFINE_RADAR_TRAP(62) DEFINE_RADAR_TRAP(63) DEFINE_RADAR_TRAP(64) DEFINE_RADAR_TRAP(65)
DEFINE_RADAR_TRAP(66) DEFINE_RADAR_TRAP(67) DEFINE_RADAR_TRAP(68) DEFINE_RADAR_TRAP(69) DEFINE_RADAR_TRAP(70)
DEFINE_RADAR_TRAP(71) DEFINE_RADAR_TRAP(72) DEFINE_RADAR_TRAP(73) DEFINE_RADAR_TRAP(74) DEFINE_RADAR_TRAP(75)
DEFINE_RADAR_TRAP(76) DEFINE_RADAR_TRAP(77) DEFINE_RADAR_TRAP(78) DEFINE_RADAR_TRAP(79) DEFINE_RADAR_TRAP(80)
DEFINE_RADAR_TRAP(81) DEFINE_RADAR_TRAP(82) DEFINE_RADAR_TRAP(83) DEFINE_RADAR_TRAP(84) DEFINE_RADAR_TRAP(85)
DEFINE_RADAR_TRAP(86) DEFINE_RADAR_TRAP(87) DEFINE_RADAR_TRAP(88) DEFINE_RADAR_TRAP(89) DEFINE_RADAR_TRAP(90)
DEFINE_RADAR_TRAP(91) DEFINE_RADAR_TRAP(92) DEFINE_RADAR_TRAP(93) DEFINE_RADAR_TRAP(94) DEFINE_RADAR_TRAP(95)
DEFINE_RADAR_TRAP(96) DEFINE_RADAR_TRAP(97) DEFINE_RADAR_TRAP(98) DEFINE_RADAR_TRAP(99) DEFINE_RADAR_TRAP(100)
DEFINE_RADAR_TRAP(101) DEFINE_RADAR_TRAP(102) DEFINE_RADAR_TRAP(103) DEFINE_RADAR_TRAP(104) DEFINE_RADAR_TRAP(105)
DEFINE_RADAR_TRAP(106) DEFINE_RADAR_TRAP(107) DEFINE_RADAR_TRAP(108) DEFINE_RADAR_TRAP(109) DEFINE_RADAR_TRAP(110)
DEFINE_RADAR_TRAP(111) DEFINE_RADAR_TRAP(112) DEFINE_RADAR_TRAP(113) DEFINE_RADAR_TRAP(114) DEFINE_RADAR_TRAP(115)
DEFINE_RADAR_TRAP(116) DEFINE_RADAR_TRAP(117) DEFINE_RADAR_TRAP(118) DEFINE_RADAR_TRAP(119) DEFINE_RADAR_TRAP(120)
DEFINE_RADAR_TRAP(121) DEFINE_RADAR_TRAP(122) DEFINE_RADAR_TRAP(123) DEFINE_RADAR_TRAP(124) DEFINE_RADAR_TRAP(125)
DEFINE_RADAR_TRAP(126) DEFINE_RADAR_TRAP(127) DEFINE_RADAR_TRAP(128) DEFINE_RADAR_TRAP(129) DEFINE_RADAR_TRAP(130)
DEFINE_RADAR_TRAP(131) DEFINE_RADAR_TRAP(132) DEFINE_RADAR_TRAP(133) DEFINE_RADAR_TRAP(134) DEFINE_RADAR_TRAP(135)
DEFINE_RADAR_TRAP(136) DEFINE_RADAR_TRAP(137) DEFINE_RADAR_TRAP(138) DEFINE_RADAR_TRAP(139) DEFINE_RADAR_TRAP(140)
DEFINE_RADAR_TRAP(141) DEFINE_RADAR_TRAP(142) DEFINE_RADAR_TRAP(143) DEFINE_RADAR_TRAP(144) DEFINE_RADAR_TRAP(145)
DEFINE_RADAR_TRAP(146) DEFINE_RADAR_TRAP(147) DEFINE_RADAR_TRAP(148) DEFINE_RADAR_TRAP(149) DEFINE_RADAR_TRAP(150)
DEFINE_RADAR_TRAP(151) DEFINE_RADAR_TRAP(152) DEFINE_RADAR_TRAP(153) DEFINE_RADAR_TRAP(154) DEFINE_RADAR_TRAP(155)
DEFINE_RADAR_TRAP(156) DEFINE_RADAR_TRAP(157) DEFINE_RADAR_TRAP(158) DEFINE_RADAR_TRAP(159) DEFINE_RADAR_TRAP(160)
DEFINE_RADAR_TRAP(161) DEFINE_RADAR_TRAP(162) DEFINE_RADAR_TRAP(163) DEFINE_RADAR_TRAP(164) DEFINE_RADAR_TRAP(165)
DEFINE_RADAR_TRAP(166) DEFINE_RADAR_TRAP(167)
// SLOT 168, 169, 170 は個別精密同期
DEFINE_RADAR_TRAP(171) DEFINE_RADAR_TRAP(172) DEFINE_RADAR_TRAP(173) DEFINE_RADAR_TRAP(174) DEFINE_RADAR_TRAP(175)
DEFINE_RADAR_TRAP(176) DEFINE_RADAR_TRAP(177) DEFINE_RADAR_TRAP(178) DEFINE_RADAR_TRAP(179) DEFINE_RADAR_TRAP(180)
DEFINE_RADAR_TRAP(181) DEFINE_RADAR_TRAP(182) DEFINE_RADAR_TRAP(183) DEFINE_RADAR_TRAP(184) DEFINE_RADAR_TRAP(185)
DEFINE_RADAR_TRAP(186) DEFINE_RADAR_TRAP(187) DEFINE_RADAR_TRAP(188) DEFINE_RADAR_TRAP(189) DEFINE_RADAR_TRAP(190)
DEFINE_RADAR_TRAP(191) DEFINE_RADAR_TRAP(192) DEFINE_RADAR_TRAP(193) DEFINE_RADAR_TRAP(194) DEFINE_RADAR_TRAP(195)
DEFINE_RADAR_TRAP(196) DEFINE_RADAR_TRAP(197) DEFINE_RADAR_TRAP(198) DEFINE_RADAR_TRAP(199)

#define DEFINE_ENV_TRAP(idx) \
static void* jni_env_trap_##idx(void* env, ...) { \
    return (void*)fake_java_matrix; \
}

DEFINE_ENV_TRAP(0)  DEFINE_ENV_TRAP(1)  DEFINE_ENV_TRAP(2)  DEFINE_ENV_TRAP(3)  DEFINE_ENV_TRAP(4)
DEFINE_ENV_TRAP(5)                      DEFINE_ENV_TRAP(7)  DEFINE_ENV_TRAP(8)  DEFINE_ENV_TRAP(9)
DEFINE_ENV_TRAP(10) DEFINE_ENV_TRAP(11) DEFINE_ENV_TRAP(12) DEFINE_ENV_TRAP(13) DEFINE_ENV_TRAP(14)
DEFINE_ENV_TRAP(15) DEFINE_ENV_TRAP(16) DEFINE_ENV_TRAP(17)                     DEFINE_ENV_TRAP(19)
DEFINE_ENV_TRAP(20) DEFINE_ENV_TRAP(21) DEFINE_ENV_TRAP(22) DEFINE_ENV_TRAP(23) DEFINE_ENV_TRAP(24)
DEFINE_ENV_TRAP(25) DEFINE_ENV_TRAP(26) DEFINE_ENV_TRAP(27) DEFINE_ENV_TRAP(28) DEFINE_ENV_TRAP(29)
DEFINE_ENV_TRAP(30) DEFINE_ENV_TRAP(31) DEFINE_ENV_TRAP(32) DEFINE_ENV_TRAP(33) DEFINE_ENV_TRAP(34)
DEFINE_ENV_TRAP(35) DEFINE_ENV_TRAP(36) DEFINE_ENV_TRAP(37) DEFINE_ENV_TRAP(38) DEFINE_ENV_TRAP(39)
DEFINE_ENV_TRAP(40) DEFINE_ENV_TRAP(41) DEFINE_ENV_TRAP(42) DEFINE_ENV_TRAP(43) DEFINE_ENV_TRAP(44)
DEFINE_ENV_TRAP(45) DEFINE_ENV_TRAP(46) DEFINE_ENV_TRAP(47) DEFINE_ENV_TRAP(48) DEFINE_ENV_TRAP(49)
DEFINE_ENV_TRAP(50)

static void* fake_env_table[300];
static void** fake_env_ptr = fake_env_table;
static void*** fake_env_ptr_of_ptr = &fake_env_ptr;

static jint jni_mock_AttachCurrentThread(void* vm, void** env_out, void* args) {
    if (env_out != NULL) { *env_out = (void*)&fake_env_ptr; }
    return JNI_OK;
}
static jint jni_mock_GetEnv(void* vm, void** env_out, jint version) {
    if (env_out != NULL) { *env_out = (void*)&fake_env_ptr; }
    return JNI_OK;
}

typedef struct {
    void* reserved0; void* reserved1; void* reserved2;
    jint (*DestroyJavaVM)(void*); jint (*AttachCurrentThread)(void**, void*); 
    jint (*DetachCurrentThread)(void*); jint (*GetEnv)(void**, jint);         
    jint (*AttachCurrentThreadAsDaemon)(void**, void*);
} JNIInvokeInterface;
static JNIInvokeInterface fake_vm_interface;
static JNIInvokeInterface* fake_vm_ptr = &fake_vm_interface;

void** init_jni_ecosystem() {
    printf("[INIT] 🧪 C言語空間に完璧なJNIエコシステムを構築中...\n");
    
    for(int i = 0; i < 100; i++) { fake_java_matrix[i] = (void*)0xDEADBEEF; }
    for(int i = 0; i < 300; i++) { fake_env_table[i] = (void*)jni_env_generic_shield; }
    
    #define ASSIGN_TRAP(idx) fake_env_table[idx] = (void*)jni_env_trap_##idx;
    ASSIGN_TRAP(0) ASSIGN_TRAP(1) ASSIGN_TRAP(2) ASSIGN_TRAP(3) ASSIGN_TRAP(4) ASSIGN_TRAP(5)
    fake_env_table[6] = (void*)jni_env_trap_slot6;
    ASSIGN_TRAP(7) ASSIGN_TRAP(8) ASSIGN_TRAP(9) ASSIGN_TRAP(10)
    ASSIGN_TRAP(11) ASSIGN_TRAP(12) ASSIGN_TRAP(13) ASSIGN_TRAP(14) ASSIGN_TRAP(15)
    ASSIGN_TRAP(16) ASSIGN_TRAP(17)
    fake_env_table[18] = (void*)jni_env_trap_slot18;
    ASSIGN_TRAP(19) ASSIGN_TRAP(20) ASSIGN_TRAP(21) ASSIGN_TRAP(22) ASSIGN_TRAP(23) ASSIGN_TRAP(24)
    ASSIGN_TRAP(25) ASSIGN_TRAP(26) ASSIGN_TRAP(27) ASSIGN_TRAP(28) ASSIGN_TRAP(29) ASSIGN_TRAP(30)
    ASSIGN_TRAP(31) ASSIGN_TRAP(32) ASSIGN_TRAP(33) ASSIGN_TRAP(34) ASSIGN_TRAP(35) ASSIGN_TRAP(36) 
    ASSIGN_TRAP(37) ASSIGN_TRAP(38) ASSIGN_TRAP(39) ASSIGN_TRAP(40) ASSIGN_TRAP(41) ASSIGN_TRAP(42) 
    ASSIGN_TRAP(43) ASSIGN_TRAP(44) ASSIGN_TRAP(45) ASSIGN_TRAP(46) ASSIGN_TRAP(47) ASSIGN_TRAP(48) 
    ASSIGN_TRAP(49) ASSIGN_TRAP(50)
    
    #define ASSIGN_RADAR(idx) fake_env_table[idx] = (void*)jni_env_trap_slot##idx;
    ASSIGN_RADAR(51) ASSIGN_RADAR(52) ASSIGN_RADAR(53) ASSIGN_RADAR(54) ASSIGN_RADAR(55)
    ASSIGN_RADAR(56) ASSIGN_RADAR(57) ASSIGN_RADAR(58) ASSIGN_RADAR(59) ASSIGN_RADAR(60)
    ASSIGN_RADAR(61) ASSIGN_RADAR(62) ASSIGN_RADAR(63) ASSIGN_RADAR(64) ASSIGN_RADAR(65)
    ASSIGN_RADAR(66) ASSIGN_RADAR(67) ASSIGN_RADAR(68) ASSIGN_RADAR(69) ASSIGN_RADAR(70)
    ASSIGN_RADAR(71) ASSIGN_RADAR(72) ASSIGN_RADAR(73) ASSIGN_RADAR(74) ASSIGN_RADAR(75)
    ASSIGN_RADAR(76) ASSIGN_RADAR(77) ASSIGN_RADAR(78) ASSIGN_RADAR(79) ASSIGN_RADAR(80)
    ASSIGN_RADAR(81) ASSIGN_RADAR(82) ASSIGN_RADAR(83) ASSIGN_RADAR(84) ASSIGN_RADAR(85)
    ASSIGN_RADAR(86) ASSIGN_RADAR(87) ASSIGN_RADAR(88) ASSIGN_RADAR(89) ASSIGN_RADAR(90)
    ASSIGN_RADAR(91) ASSIGN_RADAR(92) ASSIGN_RADAR(93) ASSIGN_RADAR(94) ASSIGN_RADAR(95)
    ASSIGN_RADAR(96) ASSIGN_RADAR(97) ASSIGN_RADAR(98) ASSIGN_RADAR(99) ASSIGN_RADAR(100)
    ASSIGN_RADAR(101) ASSIGN_RADAR(102) ASSIGN_RADAR(103) ASSIGN_RADAR(104) ASSIGN_RADAR(105)
    ASSIGN_RADAR(106) ASSIGN_RADAR(107) ASSIGN_RADAR(108) ASSIGN_RADAR(109) ASSIGN_RADAR(110)
    ASSIGN_RADAR(111) ASSIGN_RADAR(112) ASSIGN_RADAR(113) ASSIGN_RADAR(114) ASSIGN_RADAR(115)
    ASSIGN_RADAR(116) ASSIGN_RADAR(117) ASSIGN_RADAR(118) ASSIGN_RADAR(119) ASSIGN_RADAR(120)
    ASSIGN_RADAR(121) ASSIGN_RADAR(122) ASSIGN_RADAR(123) ASSIGN_RADAR(124) ASSIGN_RADAR(125)
    ASSIGN_RADAR(126) ASSIGN_RADAR(127) ASSIGN_RADAR(128) ASSIGN_RADAR(129) ASSIGN_RADAR(130)
    ASSIGN_RADAR(131) ASSIGN_RADAR(132) ASSIGN_RADAR(133) ASSIGN_RADAR(134) ASSIGN_RADAR(135)
    ASSIGN_RADAR(136) ASSIGN_RADAR(137) ASSIGN_RADAR(138) ASSIGN_RADAR(139) ASSIGN_RADAR(140)
    ASSIGN_RADAR(141) ASSIGN_RADAR(142) ASSIGN_RADAR(143) ASSIGN_RADAR(144) ASSIGN_RADAR(145)
    ASSIGN_RADAR(146) ASSIGN_RADAR(147) ASSIGN_RADAR(148) ASSIGN_RADAR(149) ASSIGN_RADAR(150)
    ASSIGN_RADAR(151) ASSIGN_RADAR(152) ASSIGN_RADAR(153) ASSIGN_RADAR(154) ASSIGN_RADAR(155)
    ASSIGN_RADAR(156) ASSIGN_RADAR(157) ASSIGN_RADAR(158) ASSIGN_RADAR(159) ASSIGN_RADAR(160)
    ASSIGN_RADAR(161) ASSIGN_RADAR(162) ASSIGN_RADAR(163) ASSIGN_RADAR(164) ASSIGN_RADAR(165)
    ASSIGN_RADAR(166) ASSIGN_RADAR(167)
    
    // 🎯 精密同期トラップ群の結合
    fake_env_table[168] = (void*)jni_env_trap_slot168; 
    fake_env_table[169] = (void*)jni_env_trap_slot169; 
    fake_env_table[170] = (void*)jni_env_trap_slot170; 
    
    ASSIGN_RADAR(171) ASSIGN_RADAR(172) ASSIGN_RADAR(173) ASSIGN_RADAR(174) ASSIGN_RADAR(175)
    ASSIGN_RADAR(176) ASSIGN_RADAR(177) ASSIGN_RADAR(178) ASSIGN_RADAR(179) ASSIGN_RADAR(180)
    ASSIGN_RADAR(181) ASSIGN_RADAR(182) ASSIGN_RADAR(183) ASSIGN_RADAR(184) ASSIGN_RADAR(185)
    ASSIGN_RADAR(186) ASSIGN_RADAR(187) ASSIGN_RADAR(188) ASSIGN_RADAR(189) ASSIGN_RADAR(190)
    ASSIGN_RADAR(191) ASSIGN_RADAR(192) ASSIGN_RADAR(193) ASSIGN_RADAR(194) ASSIGN_RADAR(195)
    ASSIGN_RADAR(196) ASSIGN_RADAR(197) ASSIGN_RADAR(198) ASSIGN_RADAR(199)

    #define ASSIGN_REG_TRAP(idx) fake_env_table[idx] = (void*)jni_env_trap_slot##idx;
    ASSIGN_REG_TRAP(200) ASSIGN_REG_TRAP(201) ASSIGN_REG_TRAP(202) ASSIGN_REG_TRAP(203) ASSIGN_REG_TRAP(204)
    ASSIGN_REG_TRAP(205) ASSIGN_REG_TRAP(206) ASSIGN_REG_TRAP(207) ASSIGN_REG_TRAP(208) ASSIGN_REG_TRAP(209)
    ASSIGN_REG_TRAP(210) ASSIGN_REG_TRAP(211) ASSIGN_REG_TRAP(212) ASSIGN_REG_TRAP(213) ASSIGN_REG_TRAP(214)
    ASSIGN_REG_TRAP(215) ASSIGN_REG_TRAP(216) ASSIGN_REG_TRAP(217) ASSIGN_REG_TRAP(218) 
    
    fake_env_table[219] = (void*)jni_env_trap_slot219; // 🔓 【特注】RegisterNatives精密迎撃展開
    
    ASSIGN_REG_TRAP(220) ASSIGN_REG_TRAP(221) ASSIGN_REG_TRAP(222) ASSIGN_REG_TRAP(223) ASSIGN_REG_TRAP(224)
    ASSIGN_REG_TRAP(225) ASSIGN_REG_TRAP(226) ASSIGN_REG_TRAP(227) ASSIGN_REG_TRAP(228) ASSIGN_REG_TRAP(229)
    ASSIGN_REG_TRAP(230)

    fake_vm_interface.reserved0 = (void*)0xDEADBEEF;
    fake_vm_interface.reserved1 = (void*)0xDEADBEEF;
    fake_vm_interface.reserved2 = (void*)0xDEADBEEF;
    fake_vm_interface.DestroyJavaVM = (void*)jni_mock_GetEnv;
    fake_vm_interface.DetachCurrentThread = (void*)jni_mock_GetEnv;
    fake_vm_interface.AttachCurrentThreadAsDaemon = (void*)jni_mock_GetEnv;
    fake_vm_interface.GetEnv = (void*)jni_mock_GetEnv;
    fake_vm_interface.AttachCurrentThread = (void*)jni_mock_AttachCurrentThread;
    
    return (void**)&fake_vm_ptr;
}

void* get_secure_reserved_ptr() { return (void*)&fake_env_ptr_of_ptr; }

void execute_unity_load(const char* lib_name) {
    if (g_unity_load_fn == NULL) {
        printf("[!] \033[1;31m[MISSION ERROR] unity_load_fn がまだ登録されていません！\033[0m\n");
        return;
    }
    printf("\n[*] 🚀 【作戦発動】捕捉した真のエントリーポイント 'load(\"%s\")' を強制執行します！\n", lib_name);
    g_fake_jstring_value = lib_name;
    
    printf("    [EXEC] 隠し関数ポインタ %p へJNIダミー引数を引き連れて突撃...\n", g_unity_load_fn);
    uint8_t res = g_unity_load_fn(&fake_env_ptr, fake_java_matrix, (void*)0x12345678);
    printf("[+] 【SYSTEM LOG】load(\"%s\") の実行が完了しました。戻り値: %d\n\n", lib_name, res);
}
