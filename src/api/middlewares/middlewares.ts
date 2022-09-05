import { IAirdropToolMiddlewareRegister } from "../common";
import { AirdropToolRegister } from "../middlewareRegister";
import { paramsChecker } from "./paramsChecker";

export function getDefaultMiddlewareRegister(): IAirdropToolMiddlewareRegister {
  const register = new AirdropToolRegister();
  register.register(paramsChecker);
  return register;
}
