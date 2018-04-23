

const itemLocations = require('./storeDirectory').itemLocations;
const assets = require('./skillSpecificAssets').assets;

var AWS = require('aws-sdk');

var DOC = require('dynamodb-doc');

exports.handler = function (event, context) {
    try {
      
        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            
            //testTheDBSTuff2();
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                }
            );
           
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};


/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
   
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
     
    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

        
    // handle yes/no intent after the user has been prompted
    if (session.attributes && session.attributes.userPromptedToContinue) {
        delete session.attributes.userPromptedToContinue;
        if ("AMAZON.NoIntent" === intentName) {
            handleFinishSessionRequest(intent, session, callback);
        } else if ("AMAZON.YesIntent" === intentName) {
            handleRepeatRequest(intent, session, callback);
        }
    }

    // dispatch custom intents to handlers here
    if ("AMAZON.StartOverIntent" === intentName) {
        getWelcomeResponse(callback);
    } else if ("WhereIsItIntent" === intentName) {
        handleWhereIsItQuery(intent, session, callback);
    } else if ("AMAZON.RepeatIntent" === intentName) {
        handleRepeatRequest(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        if (!session.attributes) {
            getWelcomeResponse(callback);
        } else { 
            handleGetHelpRequest(intent, session, callback);
        }
    } else if ("AMAZON.StopIntent" === intentName) {
        handleFinishSessionRequest(intent, session, callback);
    } else if ("AMAZON.CancelIntent" === intentName) {
        handleFinishSessionRequest(intent, session, callback);
    } else {
        throw "Invalid intent";
    }
}

function handleWhereIsItQuery (intent, session, callback) {
    
    var theThingYoureLookingFor = intent.slots.storeItems.value;
    var upCased = theThingYoureLookingFor.toUpperCase();
   // var weKnowWhereItIs = findTheThingInTheStore(theThingYoureLookingFor);
    var speechOutput = "";
    
    //figure out the syntax to extract the slot info from the intent
    // and store that in the local thingyourelookingfor var
    // hand the thing to a recognizer to look it up
    // if it's there, hand back the location
    // if it's not found, hand back a not found type of string
    
    var dynamo = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
    
    var params = {
        Key: {
                itemName: upCased
            }, 
            
        TableName: "TestPlanOGram2"
    };
    
    function gotItemFromDatabase(err, data) {
        if (err) {
            console.log("Moops");
        } else {
            console.log(data);
            if (data.Item) {
                   speechOutput = theThingYoureLookingFor + " can be found in " + data.Item.itemLocation;
            } else { 
                speechOutput = "I'm sorry but I don't know where " + theThingYoureLookingFor + " is in the store" ;
            }
            callback({},buildSpeechletResponse(speechOutput, speechOutput, true));
        }
    
    }
    
    console.log(upCased);
    
    dynamo.get(params, gotItemFromDatabase);   
   
}

function testTheDBSTuff2 (theThing, callback) {
    
    console.log("Testing the db stuff");
    
    var dynamo = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
    
    var params = {
        Key: {
                itemName: "velveeta"
            }, 
            
        TableName: "TestPlanOGram2"
    };
    
    console.log(params.TableName);
    
    var returnedValue = {};
    
    function getItemFromThisDatabase(err, data) {
        if (err) {
            console.log("Moops");
            return callback(err);
        }    else {
            console.log(data);
        }
    }
    
    dynamo.get(params, getItemFromThisDatabase );
 
}

function testTheDBSTuff() {
    
    console.log("starting testing the db stuff");
    
   // AWS.config = new AWS.Config();
   // AWS.config.region = 'us-east-1';
    //AWS.config.endpoint = 'dynamodb.us-east-1.amazonaws.com';
    //AWS.config.accessKeyId = 'AKIAJ2BBKV6VYAYPGQKA';
    //AWS.config.secretAccessKey = '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';
    
    var dynamo = new DOC.DynamoDB();

    
    
    //console.log("ddb = " + ddb);
    
    //console.log("params = " + params);
    
    var params = {};
    
    var callback = function(err, data) {
        if (err) {
          console.log(err);
          //context.fail('unable to list tables at this time');
        } else {
          console.log(data);
          //context.done(null, data);
        }
    };
    
    console.log("dynamo = " + dynamo);
    
    console.log("params = " + params);
     
    dynamo.listTables(params, callback);
     
    console.log("finished testing the db stuff");
    
   
}

function findTheThingInTheStore(theThing) {
    
    // crude mocking up of consulting the planogram DB
    // currently it is a simple data dictionary accessed as
    // the required object itemLocations
    
    
    
   
    var numberOfItems = itemLocations.length;
    
    var index = 0;
    
    var casedTargetItem = theThing.toUpperCase();
    
    var casedPossibleItem = "";
    
    
   
    while (index<numberOfItems) {
        casedPossibleItem = Object.keys(itemLocations[index]).toString().toUpperCase();
        if (casedPossibleItem == casedTargetItem) {
            return itemLocations[index][Object.keys(itemLocations[index])][0];
        }
        ++index;
    }
    
    // if the item is not found, we should write it to a not found table
    // in the db for rectification
    
    return "Not Found";
    
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
  

    // Add any cleanup logic here
}

// ------- Skill specific business logic -------


function getWelcomeResponse(callback) {
    
    // this function seems redundant and should be elevated to the intent handler where you
    // can do the callback inline
    
    
     var sessionAttributes =  {
        "speechOutput": "" + "",
        "repromptText": "" + "",
        "currentQuestionIndex": 0,
        "correctAnswerIndex": 0,
         "score": 0,
         };
    callback(sessionAttributes,
        buildSpeechletResponse( "" + "",  "" + "", false));
}



function handleRepeatRequest(intent, session, callback) {
    // Repeat the previous speechOutput and repromptText from the session attributes if available
    // else start a new game session
    
    // this function also seems redundant and like it showed be turned into an inline callback
    
    if (!session.attributes || !session.attributes.speechOutput) {
        getWelcomeResponse(callback);
    } else {
        callback(session.attributes,
            buildSpeechletResponseWithoutCard(session.attributes.speechOutput, session.attributes.repromptText, false));
    }
}

function handleGetHelpRequest(intent, session, callback) {
    // Provide a help prompt for the user, explaining how the game is played. Then, continue the game
    // if there is one in progress, or provide the option to start another one.

    // Set a flag to track that we're in the Help state.
    
    // this function should also be streamlined and elevated
  
    session.attributes.userPromptedToContinue = true;
    
    var shouldEndSession = false;
    callback(session.attributes, 
    buildSpeechletResponse(assets.HELP_MESSAGE, assets.HELP_REPROMPT_MESSAGE, shouldEndSession));
}

function handleFinishSessionRequest(intent, session, callback) {
    // End the session with a "Good bye!" if the user wants to quit the game
    callback(session.attributes,
        buildSpeechletResponseWithoutCard(assets.SIGN_OFF_MESSAGE, "", true));
}



// ------- Helper functions to build responses -------


function buildSpeechletResponse(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: assets.CARD_TITLE,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}