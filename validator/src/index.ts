import { Store, StreamParser, DataFactory } from "n3";
import { createReadStream } from "fs";
import { createUriAndTermNamespace } from "@treecg/types";

import SHACLValidator from 'rdf-validate-shacl';
import http from "http";
import https from "https";
import stream from "stream";
import path from "path";

const { namedNode } = DataFactory;

const OWL = createUriAndTermNamespace("http://www.w3.org/2002/07/owl#", "imports");


function printHelp() {
  console.error(`Usage: ${process.argv[0]} ${process.argv[1]} <configuration>`);
  console.error("Check for various validation issues with this configuration file.")
}

async function get_readstream(location: string): Promise<stream.Readable> {
  if (location.startsWith("https")) {
    return new Promise((res) => {
      https.get(location, res);
    });
  } else if (location.startsWith("http")) {
    return new Promise((res) => {
      http.get(location, res);
    });
  } else {
    return createReadStream(location);
  }
}


const loaded = new Set();
async function load_store(location: string, store: Store, recursive = true) {
  if (loaded.has(location)) { return; }
  loaded.add(location);

  console.log("Loading", location);

  const parser = new StreamParser({ baseIRI: location });
  const rdfStream = await get_readstream(location);
  rdfStream.pipe(parser);

  await new Promise(res => store.import(parser).on('end', res));

  if (recursive) {
    const other_imports = store.getObjects(namedNode(location), OWL.terms.imports, null)
    for (let other of other_imports) {
      await load_store(other.value, store, true);
    }
  }

}

async function validate_shapes(store: Store): Promise<boolean> {
  console.log("validating shapes");
  const validator = new SHACLValidator(store);
  const report = validator.validate(store);

  for (const result of report.results) {
    // See https://www.w3.org/TR/shacl/#results-validation-result for details
    // about each property
    console.log(result.message)
    console.log(result.path)
    console.log(result.focusNode)
    console.log(result.severity)
  }

  // Has errors
  return !report.conforms;
}

export async function main() {
  const file = process.argv[2];
  if (!file) {
    printHelp();
    return;
  }

  const cwd = process.cwd();
  const location = path.join(cwd, file);

  const store = new Store();
  await load_store(location, store);
  console.log("Found", store.size, "quads");
  let has_errors = false;

  has_errors = await validate_shapes(store) || has_errors;

  if (has_errors) {
    console.log("Looks bad!");
  } else {
    console.log("Looks good!");
  }
}

main();
