// -----------------------------------------------------
// Modulo: JSON Generator for IBM Watson Conversation
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
var CSV_INTENTS_INPUT = "./intents.csv";
var CSV_ENTITIES_INPUT = "./entities.csv";
var FILE_JSON_OUTPUT = './output.json';

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
  generaJSON();
}

function generaJSON() {

  generaIntents(CSV_INTENTS_INPUT);
  generaEntities(CSV_ENTITIES_INPUT);

  var jsonFile = '{' +
                  '"name": "' + WORKSPACE_NAME + '",' +
                  '"created": "' + WORKSPACE_DATE_JSON + '",' +
                  '"intents": ' + 'Aqui van intents' + ', ' + 
                  '"updated": "' + WORKSPACE_DATE_JSON + '", ' +
                  '"entities": ' + 'Aqui van entities' + ', ' +
                  '"language": "' + WORKSPACE_LANG + '", ' + 
                  '"description": "' + WORKSPACE_DESC + '", ' +
                  '"dialog_nodes": ' + 'Aqui van dialogos' + ', ' +
                  '"workspace_id": "' + WORKSPACE_ID + '", ' +
                  '"counterexamples": []}';

  fs.writeFile(FILE_JSON_OUTPUT, jsonFile, function (err) {
      if (err) {
        return console.log(err);
      }
      console.log('Archivo JSON generado');
  });

}

function generaIntents(CSVFile) {
  var parser = csv({delimiter: ','}, function(err, data) {
    
    var intents = '[';

    for(var i=0; i < data.length; i++) {
      var intent_name = data[i][0];
      var intent_description = data[i][1];

      var intent = '{' +
        '"intent": "' + intent_name + '", ' +
        '"created": "' + WORKSPACE_DATE_JSON + '", ' +
        '"updated": "' + WORKSPACE_DATE_JSON + '", ' +
        '"examples": [';
      
      // Genera ejemplos para cada intent
      for(var j=2; j < data[i].length; j++) {
        var example = '{' +
                            '"text": "' + data[i][j] + '", ' +
                            '"created": "' + WORKSPACE_DATE_JSON + '", ' +
                            '"updated": "' + WORKSPACE_DATE_JSON + '"' +
                      '}';
        if(j < data[i].length-1) {
          example += ',';
        }
        intent += example;
      }

      intent += '], ';
      intent += '"description": "' + intent_description + '"';
      intent += '}';

      if(i < data.length-1) {
        intent += ',';
      }

      intents += intent;
    }

    intents += ']';

    console.log(intents);
    console.log("El CSV Intents ha sido procesado");

  });

  fs.createReadStream(CSVFile).pipe(parser);
}

function generaEntities(CSVFile) {
  var parser = csv({delimiter: ','}, function(err, data) {

    var entity_anterior = "";
    var entity_actual = "";
    var entity_description_anterior = "";
    var entity_description_actual = "";
    var entity = "";
    var entities = "[";

    for(var i=0; i < data.length; i++) {

      entity_actual = data[i][0];
      entity_description_actual = data[i][1];
      
      if(entity_actual != entity_anterior) {

        if(entity != '') {
          // Remover la ultima coma
          if(entity.endsWith(',')) {
            entity = entity.substring(0, entity.length-1);
          }
          entity += '], ';
          entity += '"created": "' + WORKSPACE_DATE_JSON + '", ';
          entity += '"updated": "' + WORKSPACE_DATE_JSON + '", ';
          entity += '"metadata": null, ';
          entity += '"description": "' + entity_description_anterior+ '", ';
          entity += '"fuzzy_match": true';
          entity += '},';
          entities += entity;
          entity = '';
        }
        entity += '{' +
          '"entity": "' + entity_actual + '", ' +
          '"values": [';
      }

      // Procesa valor de entity
      var value = "{" +
        '"value": "' + data[i][2] + '", ' +
        '"created": "' + WORKSPACE_DATE_JSON + '", ' +
        '"updated": "' + WORKSPACE_DATE_JSON + '", ' +
        '"meta": null, ' +
        '"synonyms": [';

      for (var j = 3; j < data[i].length; j++) {
        value += '"' + data[i][j] + '"';
        if (j < data[i].length - 1) {
          value += ',';
        }
      }

      value += ']},' 
      entity += value;
      
      entity_description_anterior = entity_description_actual;
      entity_anterior = entity_actual;

    }

    // Agrego informacion de la ultima entidad
    if (entity != '') {
      // Remover la ultima coma
      if (entity.endsWith(',')) {
        entity = entity.substring(0, entity.length - 1);
      }
      entity += '], ';
      entity += '"created": "' + WORKSPACE_DATE_JSON + '", ';
      entity += '"updated": "' + WORKSPACE_DATE_JSON + '", ';
      entity += '"metadata": null, ';
      entity += '"description": "' + entity_description_actual + '", ';
      entity += '"fuzzy_match": true';
      entity += '},';
      entities += entity;
      entity = '';
    }

    // Elimina la ultima coma
    if (entities.endsWith(',')) {
      entities = entities.substring(0, entities.length - 1);
    }

    entities += ']';
    console.log(entities);
    console.log("El CSV Entities ha sido procesado");
  });

  fs.createReadStream(CSVFile).pipe(parser);
}
