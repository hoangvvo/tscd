import { exec } from "child_process";
import { logSubTask } from "./util.js";

export async function execCommand(command) {
  await new Promise((resolve, reject) => {
    logSubTask(`executing: ${command}`);
    const proc = exec(command, (err) => (err ? reject(err) : resolve()));
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
  });
}
