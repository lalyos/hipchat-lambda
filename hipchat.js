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

function main() {
    console.log("TODO ...");
}

exports.handler = function(event, context) {
  console.log("[TRACE-1] event: %j", event);
  roomId = event["stage-variables"].roomId;
  //hipchatToken = event["stage-variables"].hipchatToken;

  main();
}

main()
