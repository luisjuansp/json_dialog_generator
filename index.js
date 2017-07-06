// -----------------------------------------------------
// Modulo: JSON Generator for IBM Watson Conversation
// Descripcion:
//		Automatiza el proceso de generacion de dialogos
//		para IBM Watson Conversation
// Autor: Chatbot Fisica Universitaria
// Fecha: 03-07-2017
// -----------------------------------------------------

// Modulos requeridos
//	fs: Interaccion con el sistema
//	csv-parse: CSV to JSON
//	prompt: Entrada de texto 
var fs = require('fs');
var csv = require('csv-parse');
var prompt = require('prompt');

// Constantes para manipulacion de archivos
var CSV_INTENTS_INPUT = "./intents.csv";
var CSV_ENTITIES_INPUT = "./entities.csv";
var CSV_DIALOGO_INPUT = "./dialogo.csv";
var FILE_JSON_OUTPUT = './output.json';

// Constantes de configuracion del Chatbot
var WORKSPACE_NAME = 'Nombre Workspace';
var WORKSPACE_ID = 'ID Workspace';
var WORKSPACE_DESC = 'Descripcion Workspace';
var WORKSPACE_LANG = 'es';
var WORKSPACE_ANYTHING_ELSE = 'Respuesta cuando no se entiende la entrada';
var WORKSPACE_DATE = new Date();												
var WORKSPACE_DATE_JSON = WORKSPACE_DATE.toJSON();

// Variables de interacion
var intents_ok = false;
var entities_ok = false;
var dialogs_ok = false;
var intents;
var entities;
var dialogo;

module.exports = function() {
  main();
};

function main() {
  generaIntents(CSV_INTENTS_INPUT);
  generaEntities(CSV_ENTITIES_INPUT);
  generaDialogo(CSV_DIALOGO_INPUT);
}

function generaJSON() {

  // Verifica que ya se hayan procesado todos los archivos CSV
  if(intents_ok && entities_ok && dialogs_ok){
    // Genera la estructura del JSON
    var jsonFile = '{' +
                    '"name": "' + WORKSPACE_NAME + '",' +
                    '"language": "' + WORKSPACE_LANG + '", ' + 
                    '"description": "' + WORKSPACE_DESC + '", ' +
                    '"intents": ' + intents + ', ' + 
                    '"entities": ' + entities + ', ' +
                    '"dialog_nodes": ' + dialogo + '}';

    // Genera el archivo JSON
    fs.writeFile(FILE_JSON_OUTPUT, jsonFile, function (err) {
        if (err) {
          return console.log(err);
        }
        console.log('Archivo JSON generado');
    });
  }
}

function generaIntents(CSVFile) {
  var parser = csv({delimiter: ','}, function(err, data) {
    intents = '[';

    for(var i=0; i < data.length; i++) {
      var intent_name = data[i][0];
      var intent_description = data[i][1];

      var intent = '{' +
                    '"intent": "' + intent_name + '", ' +
                    '"examples": [';
      
      // Genera ejemplos para cada intent
      for(var j=2; j < data[i].length; j++) {
        var example = '{' +
                       '"text": "' + data[i][j] + '"' +
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

    console.log("El CSV Intents ha sido procesado");
    intents_ok = true;

    generaJSON();
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
    entities = "[";

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
          entity += '"description": "' + entity_description_anterior+ '"';
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

    // Agrego informacion de la ultima entity
    if (entity != '') {
      // Remover la ultima coma
      if (entity.endsWith(',')) {
        entity = entity.substring(0, entity.length - 1);
      }
      entity += '], ';
      entity += '"description": "' + entity_description_actual + '"';
      entity += '},';
      entities += entity;
      entity = '';
    }

    // Elimina la ultima coma
    if (entities.endsWith(',')) {
      entities = entities.substring(0, entities.length - 1);
    }

    entities += ']';

    console.log("El CSV Entities ha sido procesado");
    entities_ok = true;

    generaJSON();    
  });

  fs.createReadStream(CSVFile).pipe(parser);
}

function generaDialogo(CSVFile) {
  var parser = csv({delimiter: ','}, function(err, data) {
    
    dialogo = '[';
    var arrayNPadre = [];

    for(var i=0; i < data.length; i++) {
      
      var hijo_nodo_actual = false;
      var index_nodo_padre = -1;

      // Creo un nodoPadre
      var nodoPadreO = new nodoPadre(data[i][2], data[i][2]);

      // Verifico si el nodoPadre ya esta en el arreglo
      if(arrayNPadre.length != 0) {
        for(var k=0; k<arrayNPadre.length; k++) {
          var dialog_node_anterior = arrayNPadre[k].dialog_node;
          if(dialog_node_anterior == nodoPadreO.dialog_node) {
            hijo_nodo_actual = false;
            index_nodo_padre = k;
            break;
          }       
        }
        if(index_nodo_padre == -1) {
          hijo_nodo_actual = true;
        }
      } else {
        hijo_nodo_actual = true;
      }

      // Se obtiene la condicion para el nodoHijo
      var conditionHijo = "";
      var conditionLength = 0;
      for(var j=3; j < data[i].length; j++) {
        if(data[i][j] != '') {
          conditionHijo += data[i][j];
          conditionLength += 1;
        }
      }
      // Se genera un nodoHijo 
      var nodoHijoO = new nodoHijo(data[i][0], data[i][1], conditionHijo, conditionLength);

      // Si es hijo del nodoPadre actual
      if(hijo_nodo_actual) {
        // Añado hijo al nodoPadre actual
        nodoPadreO.hijos.push(nodoHijoO);
        // Añado nodoPadre al arreglo
        arrayNPadre.push(nodoPadreO);
      } else {
        // Si no es hijo del nodoPadre actual
        // Añado nodoHijo a un nodoPadre anterior
        arrayNPadre[index_nodo_padre].hijos.push(nodoHijoO); 
      }
    }

    // Se tiene que ordenar el arreglo de nodoHijo de cada nodoPadre
    for(var i=0; i<arrayNPadre.length; i++) {
      if(arrayNPadre[i].hijos.length > 0) {
        arrayNPadre[i].hijos.sort(function (a,b) {
          return (b.conditionLength - a.conditionLength);
        });
      }
    }

    for(var i=0; i<arrayNPadre.length; i++) {
      // Creo la estructura JSON del nodoPadre
      dialogo += '{' +
                    '"dialog_node": "' + arrayNPadre[i].dialog_node + '",'
                    '"conditions": "' + arrayNPadre[i].conditions + '",';
      if(i == 0) {
        dialogo +=  '"previous_sibling": "Conversation Start"';  
      } else {
        dialogo += '"previous_sibling": "' + arrayNPadre[i-1].dialog_node + '"';
      } 
      dialogo += '},';        
      for(var j=0; j<arrayNPadre[i].hijos.length; j++) {
        var nodoH = arrayNPadre[i].hijos[j];
        // Creo la estructura JSON de los nodoHijo
        dialogo += '{' +
                    '"dialog_node": "' + nodoH.dialog_node + '",'
                    '"conditions": "' + nodoH.conditions + '",';
        dialogo += '"output": { "text": { "values": [' + '"' +nodoH.respuesta + '"' + '], "selection_policy": "sequential"}},'
        if(j == 0) {
          dialogo += '"previous_sibling": null';
        } else {
          dialogo += '"previous_sibling": "' + arrayNPadre[i].hijos[j-1].dialog_node + '"';
        }
        dialogo += '},';
      }
    }

    // Remuevo la ultima coma
    if (dialogo.endsWith(',')) {
      dialogo = dialogo.substring(0, dialogo.length - 1);
    }

    dialogo += ']';

    console.log("El CSV Dialogo ha sido procesado")
    dialogs_ok = true;

    generaJSON();
  });

  fs.createReadStream(CSVFile).pipe(parser);
}

function nodoPadre(dialog_node, conditions) {
  this.dialog_node = dialog_node;
  this.conditions = conditions;
  this.hijos = [];
}

function nodoHijo(dialog_node, respuesta, conditions, conditionLength) {
  this.dialog_node = dialog_node;
  this.respuesta = respuesta;
  this.conditions = conditions;
  this.conditionLength = conditionLength;
}
