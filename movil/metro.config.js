// La app comparte con la web textos, tipos, constantes y validaciones (`../src`): Metro tiene
// que mirar esa carpeta. Los paquetes de un archivo compartido se buscan en `movil/node_modules`
// (no en los de la web, que Metro no mira): así nunca entra el React de la web, que es otra
// versión y rompería la app.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../src")];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

module.exports = config;
