#!/usr/bin/env node

import { readFile, rm, writeFile } from "fs/promises";
import { globSync } from "glob";
import kleur from "kleur";
import { loadJsonFile } from "load-json-file";
import minimist from "minimist";
import { join } from "path";
import { writeJsonFile } from "write-json-file";
import { execCommand } from "./cmd.js";
import {
  addRelativeIfNeeded,
  log,
  logSubTask,
  logTask,
  modifyProperty,
} from "./util.js";

const cwd = process.cwd();
const argv = minimist(
  process.argv.slice(process.argv.findIndex((a) => a.endsWith("tscd"))),
);

const tsconfigPath = join(cwd, argv.project || "tsconfig.json");
const packagejsonPath = join(cwd, "package.json");

function getOutDir(tsconfig) {
  const outDir = argv.outDir || tsconfig.compilerOptions.outDir;
  if (!outDir) throw new Error("--outDir must be provided");
  return outDir;
}

function getEntry() {
  const entry = argv.entry || "index.js";
  return entry;
}

async function updateTsconfig(obj) {
  logTask(`check tsconfig.json`);
  let tsconfigModified = false;

  tsconfigModified = await modifyProperty(
    obj,
    "compilerOptions.module",
    "NodeNext",
  );
  tsconfigModified = await modifyProperty(
    obj,
    "compilerOptions.moduleResolution",
    "NodeNext",
  );
  tsconfigModified = await modifyProperty(
    obj,
    "compilerOptions.declaration",
    false,
  );

  if (!tsconfigModified) return;

  await writeJsonFile(tsconfigPath, obj, { detectIndent: true });
}

const esmDir = "esm";
const commonjsDir = "commonjs";
const typesDir = "types";

async function updatePackagejson(pj, outDir, entry) {
  logTask(`update package.json`);
  const typesExportPath = addRelativeIfNeeded(
    [outDir, typesDir, entry.replace(".js", ".d.ts")].join("/"),
  );

  const esmExportPath = addRelativeIfNeeded([outDir, esmDir, entry].join("/"));

  const commonjsExportPath = addRelativeIfNeeded(
    [outDir, commonjsDir, entry.replace(".js", ".cjs")].join("/"),
  );

  pj.type = "module";
  pj.exports = {
    import: {
      types: typesExportPath,
      default: esmExportPath,
    },
    require: {
      types: typesExportPath,
      default: commonjsExportPath,
    },
  };
  pj.main = commonjsExportPath;
  pj.types = typesExportPath;
  await writeJsonFile(join(cwd, "package.json"), pj, {
    detectIndent: true,
  });
}

function buildTscArgStr() {
  const argStrings = [];
  for (const argKey of Object.keys(argv)) {
    if (
      argKey === "_" ||
      argKey === "--" ||
      argKey === "entry" ||
      argKey === "outDir"
    )
      continue;
    argStrings.push(`--${argKey} ${argv[argKey]}`);
  }
  return argStrings.join(" ");
}

async function build() {
  const pj = await loadJsonFile(packagejsonPath);
  const tsconfig = await loadJsonFile(tsconfigPath);

  log(kleur.bold(`building package ${kleur.underline(pj.name)}`));

  const outDir = getOutDir(tsconfig);
  const entry = getEntry();

  await updateTsconfig(tsconfig);

  await updatePackagejson(pj, outDir, entry);

  const tscExec = "tsc";

  async function buildCommmonjs() {
    logTask("build CommonJS");
    const tscArgStr = buildTscArgStr();
    const commonjsOutDir = outDir + "/" + commonjsDir;
    const command = `${tscExec} ${tscArgStr} --outDir ${commonjsOutDir} --module commonjs --moduleResolution Node`;
    await execCommand(command);
    // rewrite js to cjs
    const jsFiles = globSync(`${commonjsOutDir}/**/*.js`);
    let processedCount = 0;
    async function processFile(jsFile) {
      const currFile = jsFile;
      const newFile =
        jsFile.substring(0, jsFile.length - ".js".length) + ".cjs";
      let content = (await readFile(currFile)).toString();
      content = content.replace(/(?<=require\(".*)(\.js)(?="\))/g, ".cjs");
      // rewrite cjs to js
      await writeFile(newFile, content);
      await rm(currFile);
      processedCount += 1;
    }
    await Promise.all(jsFiles.map(processFile));
    logSubTask(`post-processed ${processedCount} CJS files`);
  }

  async function buildEsm() {
    logTask("build ESM");
    const tscArgStr = buildTscArgStr();
    const command = `${tscExec} ${tscArgStr} --outDir ${join(outDir, esmDir)}`;
    await execCommand(command);
  }

  async function emitDeclaration() {
    logTask("emitDeclaration");
    const tscArgStr = buildTscArgStr();
    const command = `${tscExec} ${tscArgStr} --outDir ${join(
      outDir,
      typesDir,
    )} --declaration --emitDeclarationOnly`;
    await execCommand(command);
  }

  // build commonjs
  await buildCommmonjs();

  // build commonjs
  await buildEsm();

  // emit declaration
  await emitDeclaration();
}

try {
  await build();
  log(kleur.green("build successfully"));
} catch (e) {
  log(kleur.red(`${kleur.bold("build failed:")}`));
  console.error(e);
  process.exit(1);
}
