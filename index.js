// -----------------------------------------------------
// Modulo: JSON Generator for IBM Watson Conversation
// Descripcion:
//    Automatiza el proceso de generacion de dialogos
//    para IBM Watson Conversation
// Autor: Chatbot Fisica Universitaria
// Fecha: 03-07-2017
// -----------------------------------------------------

// Modulos requeridos
//  fs: Interaccion con el sistema
//  csv-parse: CSV to JSON
//  prompt: Entrada de texto 
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
var intents;
var entities;
var dialogo;
var categorias = {};

module.exports = function () {
    main();
};

function main() {
    generaIntents(CSV_INTENTS_INPUT);
}

function generaJSON() {

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

function generaIntents(CSVFile) {

    var parser = csv({ delimiter: ',' }, function (err, data) {

        // Objeto temporal de conversion
        intents_obj = {};

        // Objeto final de Intents
        output = [];

        // Por cada ejemplo de intent
        for (var i = 0; i < data.length; i++) {
            // Sacas el nombre y ejemplo
            var intent_name = data[i][1];
            var intent_example = data[i][0];
            // Si aun no habia dicho intent
            if (intents_obj[intent_name] == null) {
                // Crear una lista vacia
                intents_obj[intent_name] = [];
            }
            // Meter el ejemplo a la lista del intent
            intents_obj[intent_name].push({
                text: intent_example
            });
        }

        // Por cada intent en el objeto
        Object.keys(intents_obj).forEach(function (key) {
            // Meter intent y todos los ejemplos al objeto de salida
            output.push({
                intent: key,
                examples: intents_obj[key]
            });
        })

        // Transformar el objeto de salida a string
        intents = JSON.stringify(output);
        console.log("El CSV Intents ha sido procesado");

        generaEntities(CSV_ENTITIES_INPUT);
    });

    fs.createReadStream(CSVFile).pipe(parser);
}

function generaEntities(CSVFile) {

    var parser = csv({ delimiter: ',' }, function (err, data) {

        // Objeto temporal de conversion
        var entities_obj = {};

        // Objeto de salida
        var output = [];

        // Por cada valor de la entity
        for (var i = 0; i < data.length; i++) {

            // Sacar la categoria/entity
            entity = data[i][0];

            // Sacar el valor
            value = data[i][1];

            // Guardar a que entity pertenece el valor
            categorias[value] = entity;

            // Sacar la lista de sinonimos
            synonyms = [];

            for (var j = 2; j < data[i].length; j++) {
                if (data[i][j] == "" || data[i][j] == null) break;
                synonyms.push(data[i][j]);
            }

            // Si no existe la entity en el objeto temporal, crear un objeto nuevo
            if (entities_obj[entity] == null) entities_obj[entity] = {};

            // Meter los sinonimos con su respectivo valor
            entities_obj[entity][value] = synonyms;

        }

        // Por cada entity
        Object.keys(entities_obj).forEach(function (entity) {

            // Obtener sus valores con sinonimos
            var values = [];

            Object.keys(entities_obj[entity]).forEach(function (value) {
                values.push({
                    value: value,
                    synonyms: entities_obj[entity][value]
                });
            });

            // Meter la entity con sus valores
            output.push({
                entity: entity,
                values: values
            });
        });
        
        // Transoformar el objeto a string
        entities = JSON.stringify(output);
        console.log("El CSV Entities ha sido procesado");

        generaDialogo(CSV_DIALOGO_INPUT);
    });

    fs.createReadStream(CSVFile).pipe(parser);
}

function generaDialogo(CSVFile) {

    var parser = csv({ delimiter: ',' }, function (err, data) {

        // Tener un objeto de intents para el primer nivel
        var intents = {};

        // Objeto temporal de conversion
        var dialog_obj = {};

        // Objeto de salida
        var output = [];

        // Por cada nodo final/respuesta
        for (var i = 0; i < data.length; i++) {

            // Obtener su id y corregirlo
            var id = data[i][0];
            id = id.replace(/\+/g, " ");

            // Obtener la respuesta e intent
            var respuesta = data[i][1];
            var intent = data[i][2];

            // Guardar cual es el primer hijo de este intent para el jump-to
            if (intents[intent] == null) intents[intent] = id;

            // Generar el string de condicion
            var condicion = "";

            for (var j = 3; j < data[i].length; j++) {

                if (data[i][j] == null || data[i][j] == "") break;

                // Crear "@entity:(value) && @entity:(value)..."
                condicion += "@" + categorias[data[i][j]] + ":(" + data[i][j] + ") && ";
            }

            // Borrar ultimo "&&"
            if (condicion.length != 0) condicion = condicion.substring(0, condicion.length - 4);

            // Crear la rama del intent si no existe
            if (dialog_obj[intent] == null) dialog_obj[intent] = {};

            // Asignar condicion y respuesta para dicho id(nodo)
            dialog_obj[intent][id] = {
                condicion: condicion,
                respuesta: respuesta
            };
        }

        // Crear el primer nodo para la bienvenida
        output.push({
            parent: null,
            conditions: "conversation_start",
            dialog_node: "Welcome",
            previous_sibling: null,
            output: {
                text: {
                    values: [
                        "Hola, con que te puedo ayudar"
                    ],
                    selection_policy: "random"
                }
            }
        });

        // Variable para guardar el nodo precedente
        var previous_sibling = "Welcome";

        // Por cada intent
        Object.keys(intents).forEach(function (intent) {
            // Crear su nodo
            output.push({
                parent: null,
                conditions: "#" + intent,
                dialog_node: intent,
                previous_sibling: previous_sibling,
                go_to: {
                    selector: "condition",
                    dialog_node: intents[intent]
                }
            })

            // Actualizar el nodo anterior
            previous_sibling = intent;
        })

        // Variable para oredenar los nodos por numero de entities
        var output_temp = {};

        // Por cada nodo final
        Object.keys(dialog_obj).forEach(function (intent) {

            // Creamos el arreglo de nodos
            output_temp[intent] = [];

            // Por cada intent
            Object.keys(dialog_obj[intent]).forEach(function (ID) {

                // Creamos el nodo y registramos cuantas entities tiene
                output_temp[intent].push({
                    count: dialog_obj[intent][ID].condicion.split("&&").length,
                    output: {
                        parent: intent,
                        conditions: dialog_obj[intent][ID].condicion,
                        dialog_node: ID,
                        previous_sibling: previous_sibling,
                        output: {
                            text: {
                                values: [
                                    dialog_obj[intent][ID].respuesta
                                ],
                                selection_policy: "random"
                            }
                        }
                    }
                })

                previous_sibling = ID;
            });

            // Ordenamos los nodos
            output_temp[intent].sort((a, b) => {
                return b.count - a.count
            });

            // Agregamos el nodo Exit
            output_temp[intent].push({
                output: {
                    parent: intent,
                    conditions: "$reprompt",
                    dialog_node: "Exit",
                    context: {
                        reprompt: false 
                    },
                    next_step: {
                        behavior: "jump_to",
                        selector: "condition",
                        dialog_node: "Anything Else"
                    },
                    previous_sibling: previous_sibling,
                    output: {}
                }    
            });

            // Agregamos el nodo Reprompt
            output_temp[intent].push({
                output: {
                    parent: intent,
                    conditions: "anything_else",
                    dialog_node: "Reprompt",
                    context: {
                        reprompt: true 
                    },
                    next_step: {
                        behavior: "jump_to",
                        selector: "user_input",
                        dialog_node: output_temp[intent][0].output.dialog_node
                    },
                    previous_sibling: previous_sibling,
                    output: {
                        text: {
                            values: [
                                'Que con ' + intent + '?'
                            ],
                            selection_policy: "sequential"
                        }
                    }
                }    
            });

        });

        // Por cada nodo final
        Object.keys(output_temp).forEach(function (intent) {

            // El primer nodo no tiene precedente
            var previous_sibling = null;

            // Por cada intent, crear sus nodos hijos
            Object.keys(output_temp[intent]).forEach(function (index) {
                
                output.push(output_temp[intent][index].output);

                // Actualizar el nodo anterior
                previous_sibling = output_temp[intent][index].output.dialog_node;
            })

        });

        // Agrega el ultimo nodo: anything_else
        output.push({
            parent: null,
            conditions: "anything_else",
            dialog_node: "Anything Else",
            previous_sibling: output[output.length-1].dialog_node,
            output: {
                text: {
                    values: [
                        "No te entendi"
                    ],
                    selection_policy: "random"
                }
            }
        });

        // Pasar el objeto de salida a string
        dialogo = JSON.stringify(output);
        console.log("El CSV Dialogo ha sido procesado")

        generaJSON();
    });

    fs.createReadStream(CSVFile).pipe(parser);
}