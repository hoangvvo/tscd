import { getProperty, setProperty } from "dot-prop";
import kleur from "kleur";

export function modifyProperty(obj, property, value) {
  const originalValue = getProperty(obj, property);
  if (originalValue === value) return false;
  setProperty(obj, property, value);
  logSubTask(`changed ${property} to ${value}`);
  return true;
}

export function log(message) {
  console.log(`${kleur.bgBlue(kleur.white(" tscd "))} ${message}`);
}

export function logTask(message) {
  log(kleur.magenta(message));
}

export function logSubTask(message) {
  log(`\t` + kleur.grey(message));
}
