// -----------------------------------------------------
// Modulo: JSON Dialog Generator
// Descripcion:
//		Automatiza el proceso de generacion de dialogos
//		para IBM Watson Conversation
// Author: Chatbot Fisica Universitaria
// Fecha: 03-07-2017
// -----------------------------------------------------

// Modulos requeridos
//	fs: Interaccion con el sistema
//	csv-parse: CSV to JSON
//	prompt: Entrada de texto 
var fs = require('fs');
var csv = require('csv-parse');
var prompt = require('prompt');

// Constantes de interacion
var FILE_CSV_INPUT = './corpus.csv';											// Nombre del archivo CSV (Entrada)
var FILE_JSON_OUTPUT = './output.json';											// Nombre del archivo JSON (Salida)

// Constantes de configuracion del Chatbot
var WORKSPACE_NAME = 'Nombre Workspace';
var WORKSPACE_ID = 'ID Workspace';
var WORKSPACE_DESC = 'Descripcion Workspace';
var WORKSPACE_LANG = 'es';
var WORKSPACE_ANYTHING_ELSE = 'Respuesta cuando no se entiende la entrada';
var WORKSPACE_INTENT_NAME = 'my_intent';										// Prefijo para el intent
var WORKSPACE_DATE = new Date();												
var WORKSPACE_DATE_JSON = WORKSPACE_DATE.toJSON();

module.exports = function() {
  main();
};

function main() {

  // Construye JSON
  generaJSON(FILE_CSV_INPUT);

}

function generaJSON(archivoCSV) {

}













/**
 * Removes the trailer comma from a string (if ends in comma).
 * @param {string} str The string to check and modify.
 * @returns {string}
 */
function removeComma(str) {

  if (str.endsWith(',')) {
    str = str.substring(0, str.length - 1);
  }
  return str;
}

/**
 * Create a node name to use in JSON with the given index.
 * @param {number} cnt The index to use in the node name.
 * @returns {string}
 */
function createNodeName(cnt) {

  return 'node_' + (cnt + 1) + '_' + WORKSPACE_DATE.getTime();
}

/**
 * Build a dialog JSON to include in the workspace dialogs JSON.
 * @param {string} conditions The condition for the dialog (e.g. intent).
 * @param {string} nodeName The name of the node associated with this dialog.
 * @param {string} nodeNamePrev The prev node (sibling node).
 * @param {string} textOutput The Watson text output for this dialog.
 * @returns {string}
 */
function buildDialog(conditions, nodeName, nodeNamePrev, textOutput) {

  return dialogJSON =
    '{"go_to":null,' +
      '"output":{"text":"' + textOutput + '"},'+
      '"parent":null,' +
      '"context":null,' +
      '"created":"' + WORKSPACE_DATE_JSON + '",' +
      '"metadata":null,' +
      '"conditions":"' + conditions + '",' +
      '"description":null,' +
      '"dialog_node":"' + nodeName + '",' +
      '"previous_sibling":' +
        (nodeNamePrev ? '"' + nodeNamePrev + '"' : null) + '}';
}

/**
 * Build the overall workspace JSON by parsing the specified CSV file which
 * is of the format where each row has the Watson response first, the an
 * arbitrary amount of related questions for training.
 * @param {string} csvFile The CSV file to parse.
 */
function buildWorkspace(csvFile) {

  var parser = csv({delimiter: ','}, function(err, data) {

    var intents = '[', dialogs = '[';
    var nodeName = null, nodeNamePrev = null;

    var i = 0;
    for (; i < data.length; i++) {

      var intentName = WORKSPACE_INTENT_NAME + '_' + i;

      var intent =
        '{"intent":"' + intentName + '",' +
         '"created":"' + WORKSPACE_DATE_JSON + '",' +
         '"description":null,';

      var answer = '', questions = '[';

      for (j = 0; j < data[i].length; j++) {

        if (data[i][j]) {

          if (j == 0) {

            answer = data[i][j];
          }
          else {

            questions +=
              '{"text":"' + data[i][j] +
              '","created":"' + WORKSPACE_DATE_JSON + '"},';
      }}}

      questions = removeComma(questions) + ']';

      intent += '"examples":' + questions + '}';
      intents += intent + ',';

      nodeNamePrev = nodeName;
      nodeName = createNodeName(i);

      dialogs += buildDialog('#' + intentName, nodeName, nodeNamePrev, answer)
        + ',';
    }

    intents = removeComma(intents) + ']';

    dialogs += buildDialog(
      'anything_else', createNodeName(i), nodeName, WORKSPACE_ANYTHING_ELSE)
      + ']';

    var workspace =
      '{"name":"' + WORKSPACE_NAME + '",' +
      '"created":"' + WORKSPACE_DATE_JSON + '",' +
      '"intents":' + intents + ',' +
      '"entities": [],' +
      '"language":"' + WORKSPACE_LANG + '",' +
      '"metadata":null,' +
      '"modified":"' + WORKSPACE_DATE_JSON + '",' +
      '"created_by":null,' +
      '"description":"' + WORKSPACE_DESC + '",' +
      '"modified_by":null,' +
      '"dialog_nodes":' + dialogs + ',' +
      '"workspace_id":"' + WORKSPACE_ID + '"}';

    fs.writeFile(FILE_JSON_OUTPUT, workspace, function (err) {

      if (err) {
        return console.log(err);
      }

      console.log('Worksplace JSON file saved to "' + FILE_JSON_OUTPUT + '".');
    });
  });

  fs.createReadStream(csvFile).pipe(parser);
}
