import { hello } from "./mod.js";
import { goodbye } from "./sub/anothermod.js";

export function say() {
  hello();
  goodbye();
}
