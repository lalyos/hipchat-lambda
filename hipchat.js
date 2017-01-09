"use strict"
var aws  = require('aws-sdk');
var request = require('request');

function ec2Instances(reg) {

    var ec2 = new aws.EC2({region: reg});

    //console.log("listing ec2 instances in: %s", reg);
        var params = {

            Filters: [
                {
                  Name: 'instance-state-name',
                  Values: [ 'running' ]
                }
            ]
        }
    var promise = ec2.describeInstances(params).promise();
    //console.log("prom.then: %s", typeof promise.then)
    return promise.then(
        function(data){
          var instances = [];

          data.Reservations.forEach(function(res){
              res.Instances.forEach(function(ins){
                instances.push(ins);
              });
          });
          //console.log("EC2 promise: %j", instances.length);
          return instances;
        },
        function(err) {
            console.log(err);
        }
    )
}

function getHipchatPromise() {
  return new Promise(function (resolve,reject){

    var color="yellow";
    var msg="Promise geciseg";
    var format="text";
    request.post(
        {
          uri: 'https://sequenceiq.hipchat.com/v2/room/' + roomId + '/notification?auth_token=' + hipchatToken,
          body: {"color": color,"message":msg ,"notify":false,"message_format":format},
          json: true
        },
        function (error, response, body) {
            console.log("HIPCHAT ...");
            if (!error && response.statusCode == 200) {
                console.log(body);
                context.done(null, result); // SUCCESS with message
                resolve();

            }
            if (error) {
                 console.log("[ERROR] POSTing message to hipchat failed: %s", error);
            }
            console.log("HIPCHAT response: %j", response);
        }
    );
  });
}

function getRegions() {
    var ec2 = new aws.EC2({region: 'eu-central-1'});

    var promise = ec2.describeRegions({}).promise()

    return promise.then(
        function(data){
            //console.log("regions: %j", data);
            return data.Regions;
        },
        function(err) {
            console.log(err);
        }
    );
}

function hipchatMsg(msg, format, color) {

    console.log("hipchatMsg ...")
    request.post(
        {
          uri: 'https://sequenceiq.hipchat.com/v2/room/' + roomId + '/notification?auth_token=' + hipchatToken,
          body: {"color": color,"message":msg ,"notify":false,"message_format":format},
          json: true
        },
        function (error, response, body) {
            console.log("HIPCHAT ...")
            if (!error && response.statusCode == 200) {
                console.log(body);
                //context.done(null, result); // SUCCESS with message

            }
            if (error) {
                 console.log("[ERROR] POSTing message to hipchat failed: %s", error);
            }
            console.log("HIPCHAT response: %j", response)
        }
    );
    console.log("request posted")

}

function main(event,context) {
    roomId = process.env.HIPCHAT_ROOM_ID;
    hipchatToken = process.env.HIPCHAT_TOKEN;
    getRegions().then(
        function(data) {
            hipchatMsg("logeci","text", "yellow");
            console.log("[RESOLVE]");


              var responseBody = {
                    message: "Hello !",
                    input: event
                };
              var responseCode = 200;
              var response = {
                    statusCode: responseCode,
                    headers: {
                        "x-custom-header" : "my custom header value"
                    },
                    body: JSON.stringify(responseBody)
                };
              console.log("response: " + JSON.stringify(response));


            context.succeed(response);
        },
        function(err) {
            console.log("[REJECT]", err);
        }
        ).catch(function(err) {
          console.log("CATCH", err)

    });
}

var roomId;
var hipchatToken;

exports.handler = function(event, context) {
  console.log("[TRACE-1] event: %j", event);
  console.log("CONTEXT: %j",context);
 //roomId = event["stage-variables"].roomId;
  //hipchatToken = event["stage-variables"].hipchatToken;

  main(event,context);


}

main()
