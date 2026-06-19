/**
 * Gemini programming隊 3D生成ユニット
 * ミッション：物理造形用・3段円柱（ヒンジ・軸構造）
 */
const fs = require('fs');

let vertices = [];
let faces = [];
let vCount = 0;

// 円柱を生成する関数 (x, y, z, 半径, 高さ, 分割数)
function addCylinder(x, y, z, radius, height, segments, name) {
    vertices.push(`o ${name}`);
    const h2 = height / 2;
    
    // 頂点の生成（底面と上面）
    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const cx = Math.cos(theta) * radius;
        const cz = Math.sin(theta) * radius;
        // 底面の円周
        vertices.push(`v ${(x + cx).toFixed(4)} ${(y - h2).toFixed(4)} ${(z + cz).toFixed(4)}`);
        // 上面の円周
        vertices.push(`v ${(x + cx).toFixed(4)} ${(y + h2).toFixed(4)} ${(z + cz).toFixed(4)}`);
    }

    const base = vCount;
    for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        const v1 = base + i * 2 + 1;
        const v2 = base + i * 2 + 2;
        const v3 = base + next * 2 + 2;
        const v4 = base + next * 2 + 1;

        // 側面
        faces.push(`f ${v1} ${v2} ${v4}`);
        faces.push(`f ${v2} ${v3} ${v4}`);
        
        // 底面と上面の蓋（扇形）
        // ※中心点を作らず簡易的に繋いでいる
        if (i > 0 && i < segments - 1) {
            faces.push(`f ${base+1} ${base + i*2 + 1} ${base + (i+1)*2 + 1}`); // 底面
            faces.push(`f ${base+2} ${base + (i+1)*2 + 2} ${base + i*2 + 2}`); // 上面
        }
    }
    vCount += segments * 2;
}

// --- 実行：隊員の指定サイズで生成 ---

// 1. 下の大きい円柱 (高さ1, 半径10)
addCylinder(0, 0, 0, 10, 1, 32, "Large_Bottom");

// 2. 中の小さい円柱 (高さ5, 半径7.5)
// 下の円柱の上に載せるため、Y座標を調整 (1/2 + 5/2 = 3.0)
addCylinder(0, 3.0, 0, 7.5, 5, 32, "Small_Middle");

// 3. 上の大きい円柱 (高さ1, 半径10)
// さらにその上に載せる (3.0 + 5/2 + 1/2 = 6.0)
addCylinder(0, 6.0, 0, 10, 1, 32, "Large_Top");

const output = "# Gemini programming Unit\n# 3段円柱・物理造形モデル\n" + vertices.join("\n") + "\n" + faces.join("\n");
fs.writeFileSync('cylinder_stack.obj', output);

console.log("ミッション完了！ 'cylinder_stack.obj' が生成されたぞ。");
