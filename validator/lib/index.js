"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const n3_1 = require("n3");
const fs_1 = require("fs");
const types_1 = require("@treecg/types");
const rdf_validate_shacl_1 = __importDefault(require("rdf-validate-shacl"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const path_1 = __importDefault(require("path"));
const { namedNode } = n3_1.DataFactory;
const OWL = (0, types_1.createUriAndTermNamespace)("http://www.w3.org/2002/07/owl#", "imports");
function printHelp() {
    console.error(`Usage: ${process.argv[0]} ${process.argv[1]} <configuration>`);
    console.error("Check for various validation issues with this configuration file.");
}
async function get_readstream(location) {
    if (location.startsWith("https")) {
        return new Promise((res) => {
            https_1.default.get(location, res);
        });
    }
    else if (location.startsWith("http")) {
        return new Promise((res) => {
            http_1.default.get(location, res);
        });
    }
    else {
        return (0, fs_1.createReadStream)(location);
    }
}
const loaded = new Set();
async function load_store(location, store, recursive = true) {
    if (loaded.has(location)) {
        return;
    }
    loaded.add(location);
    console.log("Loading", location);
    const parser = new n3_1.StreamParser({ baseIRI: location });
    const rdfStream = await get_readstream(location);
    rdfStream.pipe(parser);
    await new Promise(res => store.import(parser).on('end', res));
    if (recursive) {
        const other_imports = store.getObjects(namedNode(location), OWL.terms.imports, null);
        for (let other of other_imports) {
            await load_store(other.value, store, true);
        }
    }
}
async function validate_shapes(store) {
    console.log("validating shapes");
    const validator = new rdf_validate_shacl_1.default(store);
    const report = validator.validate(store);
    for (const result of report.results) {
        // See https://www.w3.org/TR/shacl/#results-validation-result for details
        // about each property
        console.log(result.message);
        console.log(result.path);
        console.log(result.focusNode);
        console.log(result.severity);
    }
    // Has errors
    return !report.conforms;
}
async function main() {
    const file = process.argv[2];
    if (!file) {
        printHelp();
        return;
    }
    const cwd = process.cwd();
    const location = path_1.default.join(cwd, file);
    const store = new n3_1.Store();
    await load_store(location, store);
    console.log("Found", store.size, "quads");
    let has_errors = false;
    has_errors = await validate_shapes(store) || has_errors;
    if (has_errors) {
        console.log("Looks bad!");
    }
    else {
        console.log("Looks good!");
    }
}
exports.main = main;
main();
