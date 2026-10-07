const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");

function balancedBlock(startMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Bloco ausente: ${startMarker}`);
  const brace = source.indexOf("{", start);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Bloco sem fechamento: ${startMarker}`);
}

const settingsStart = source.indexOf("const SIM_SETTINGS = Object.freeze({");
const settingsEnd = source.indexOf("\n  });", settingsStart);
assert.notEqual(settingsStart, -1, "Configuração do simulador ausente.");
assert.notEqual(settingsEnd, -1, "Configuração do simulador incompleta.");
const settings = `${source.slice(settingsStart, settingsEnd + 6)};`;
const calculator = balancedBlock("function calculateSimulation(input)");
const context = {};
vm.runInNewContext(`${settings}\n${calculator}\nthis.calculateSimulation = calculateSimulation;`, context);

const cases = [
  ["Licenciado · padrão", { profile: "licensee", energyBase: 500, energyCount: 10, energyRule: "range", telecomPlan: 54.9, telecomCount: 10, insuranceBase: 300, insuranceCount: 10 }, [32000, 42000]],
  ["Licenciado · zerado", { profile: "licensee", energyBase: 500, energyCount: 0, energyRule: "range", telecomPlan: 54.9, telecomCount: 0, insuranceBase: 300, insuranceCount: 0 }, [0, 0]],
  ["Licenciado · bases editadas", { profile: "licensee", energyBase: 750, energyCount: 4, energyRule: "range", telecomPlan: 54.9, telecomCount: 8, insuranceBase: 400, insuranceCount: 5 }, [21600, 27600]],
  ["Cliente · faixa padrão", { profile: "referrer", energyBase: 200, energyCount: 10, energyRule: "range", telecomPlan: 54.9, telecomCount: 10, insuranceBase: 200, insuranceCount: 10 }, [10500, 12500]],
  ["Cliente · regra A", { profile: "referrer", energyBase: 250, energyCount: 4, energyRule: "A", telecomPlan: 54.9, telecomCount: 16, insuranceBase: 120, insuranceCount: 5 }, [9100, 9100]],
  ["Cliente · regra C", { profile: "referrer", energyBase: 300, energyCount: 8, energyRule: "C", telecomPlan: 80, telecomCount: 0, insuranceBase: 500, insuranceCount: 2 }, [3700, 3700]],
];

for (const [name, input, expected] of cases) {
  const result = context.calculateSimulation(input);
  assert.deepEqual([result.totalMin, result.totalMax], expected, name);
  console.log(`OK · ${name} · ${result.totalMin}-${result.totalMax} centavos`);
}
