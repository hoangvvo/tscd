import { execSync } from "child_process";
import { copyFileSync, rmSync } from "fs";
import { join } from "path";

const testDir = join(process.cwd(), "test");

rmSync(join(testDir, "dist"), {
  force: true,
  recursive: true,
});

copyFileSync(
  join(testDir, "package.template.json"),
  join(testDir, "package.json")
);

copyFileSync(
  join(testDir, "tsconfig.template.json"),
  join(testDir, "tsconfig.json")
);

execSync("npm i", {
  cwd: testDir,
});

execSync("npm run build", {
  cwd: testDir,
});
