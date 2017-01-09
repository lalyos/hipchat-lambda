"use strict"
var aws  = require('aws-sdk');
var request = require('request');



function getTag(tags, key) {

    for (var i=0; i < tags.length; i++) {
        var next = tags[i];
        //console.log("[DEBUG] next:%j", next.Key)
        if (next.Key == key) {
            return next.Value;
        }
    }
    return null;

}


function ec2Instances(reg) {

    var ec2 = new aws.EC2({region: reg});

    console.log("listing ec2 instances in: %s", reg);
        var params = {
            Filters: [
                {
                  Name: 'instance-state-name',
                  Values: [ 'running' ]
                }
            ]
        }
    var promise = ec2.describeInstances(params).promise();
    //console.log("prom.then: %s", typeof promise.then);
    return promise.then(
        function(data){
          var instances = [];

          data.Reservations.forEach(function(res){
              res.Instances.forEach(function(ins){
                instances.push(ins);
              });
          });
          console.log("EC2 promise: %j", instances.length);
          return instances;
        },
        function(err) {
            console.log(err);
        }
    ).catch(function(err) {
        console.log("CATCH-ec2Instances",err)
    });
}

function getDate(d) {
    var yyyy = d.getFullYear().toString();
    var mm = (d.getMonth()+1).toString(); // getMonth() is zero-based
    var dd  = d.getDate().toString();
    return yyyy + "-" + (mm[1]?mm:"0"+mm[0]) + "-" + (dd[1]?dd:"0"+dd[0]);
}

function processInstances (instances) {
    //console.log("[PROCESS] instances: %s", instances.length);

    instances.forEach(function (ins){
        //var ins=res.Instances[i];

        var stackName = getTag(ins.Tags, 'aws:cloudformation:stack-name');
        //console.log("InstanceId: %s, stack:%s", ins.InstanceId, stackName);
        var role = getTag(ins.Tags, 'instanceGroup');
        if (stackName != null) {
            //console.log("stackInstance found: %j", ins);
            var stack = allInstances.stacks[stackName];
            if (stack != null) {
                allInstances.stacks[stackName].count++;
            } else {
                allInstances.stacks[stackName] = {
                    zone: ins.Placement.AvailabilityZone,
                    started: getDate(ins.LaunchTime),
                    count: 1
                };
                //console.log("allInstances : %j ", allInstances)
            }

            if ( role == "cbgateway") {
                 allInstances.stacks[stackName]["ambari"] = "http://" + ins.PublicIpAddress + ":8080";
                 console.log("ambari found: %j", allInstances.stacks[stackName]);
            }

        } else {
            //console.log("naked instance found: %j", ins);
            //console.log(" ins.LaunchTime: %s", getDate(ins.LaunchTime));

            allInstances.naked[ins.InstanceId] = {
                zone: ins.Placement.AvailabilityZone,
                id: ins.InstanceId,
                name: getTag(ins.Tags,'Name'),
                owner: getTag(ins.Tags,'Owner'),
                started: getDate(ins.LaunchTime),
                publicip: ins.PublicIpAddress
            };
        }
    });
}

function getInstancesHtml() {
    console.log("[PRINTINSTANCES]");
    var ret = "";
    //console.log("[PRINT] allInstances.stacks %j", allInstances);
    ret += '<b>Stacks</b> <table border="1">';
    ret += "<tr><th>Zone</th> <th>Started</th> <th>StackName</th> <th># of Instances</th> <th>Ambari</th> </tr>"
    for (var next in  allInstances.stacks) {
        //console.log("[STACK-%s] %d instances in: %s", allInstances.stacks[next].region, allInstances.stacks[next].count, next);
        var stack = allInstances.stacks[next];
        ret += "<tr><td>" + stack.zone + "</td> <td>" + stack.started + "</td> <td>" + next + "</td> <td>" + stack.count + "</td> <td>" + stack.ambari +"</td></tr>"
    }
    ret += "</table> <b>Instances</b> <table>"
    ret += "<tr><th>Zone</th> <th>Started</th> <th>InstanceId</th> <th>Name</th> <th>Owner</th> <th>PublicIp</th></tr>"
    for (var next in  allInstances.naked) {
        var ins = allInstances.naked[next];
        //console.log("[INSTANCE-%s] %s: %s", allInstances.naked[next].region, next, allInstances.naked[next].name);
        ret += "<tr><td>" + ins.zone + "</td> <td>" + ins.started + "</td> <td>" + ins.id + "</td> <td>" + ins.name + "</td> <td>" + ins.owner + "</td> <td>" + ins.publicip + "</td></tr>"
    }
    ret += "</table>";
    return ret;

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





function getHipchatPromise(msg, format, color) {
  return new Promise(function (resolve,reject){

    roomId = process.env.HIPCHAT_ROOM_ID;
    hipchatToken = process.env.HIPCHAT_TOKEN;

    request.post(
        {
          uri: 'https://sequenceiq.hipchat.com/v2/room/' + roomId + '/notification?auth_token=' + hipchatToken,
          body: {"color": color,"message":msg ,"notify":false,"message_format":format},
          json: true
        },
        function (error, response, body) {
            console.log("HIPCHATPromise : %j", response);
            if (!error && response.statusCode >= 200 && response.statusCode < 300) {
                console.log("HIPCHATPromise: OK OK OK");
                console.log(body);
                //context.done(null, result); // SUCCESS with message
                resolve();

            }
            if (error) {
                 console.log("[ERROR] POSTing message to hipchat failed: %s", error);
                 reject(error);
                 console.log("HIPCHAT response: %j", response);
            }

        }
    );
  });
}

function getAllInstances() {
    return getRegions().then(
        function(data) {
            data = [{"RegionName":"eu-west-1"},{"RegionName":"eu-central-1"},{"RegionName":"us-east-1"},{"RegionName":"us-west-1"},{"RegionName":"us-west-2"}];
            var pp = [];
            console.log("[DONE] regions: %j length:%s", data, data.length);
            data=[{RegionName: "eu-central-1"}];
            for (var i=0; i < data.length; i++) {
                console.log("reg: %j", data[i]);
                var p = ec2Instances(data[i].RegionName);
                pp.push(p);
            }
            return Promise.all(pp);
        },
        function(err) {
            console.log(err);
        }
    ).catch(function(err){
            console.log("CATCH-getAllInstances", err);
    });

}

function getAllInstancesAsHtml() {
    console.log("getAllInstancesAsHtml()")
    return getAllInstances().then(
        function(data) {
            data.forEach(function(instances){
                processInstances(instances);
            });
            var html = getInstancesHtml();
            console.log("%s", html);

            //getHipchatPromise(html,"html","green")
            //hipchatInfo(html)
            return html;
        },
        function(err) {
             console.log(err);
        }
    ).catch(function(err){
            console.log("CATCH-getAllInstancesAsHtml", err);
    });

}

function main(event,context) {
    //console.log("ENV: %j", process.env);

   if (process.env.LAMBDA_RUNTIME_DIR) {
       console.log("nothing todo in main")
   } else{
        //getHipchatPromise("MAIN promise", "text", "yellow").then(
        getAllInstancesAsHtml().then(
              function(data){
                  console.log("MAIN-RESOLVE data: %j", data);

              },
              function(err){
                  console.log("MAIN-REJECT", err);

       }).catch(function(err){
            console.log("MAIN-CATCH", err);
       });
   };

}

var allInstances = {
    stacks: {},
    naked: {}
}

var roomId;
var hipchatToken;

exports.handler = function(event, context) {
  console.log("[TRACE-1] event: %j", event);
  console.log("ENV: %j", process.env);
  console.log("CONTEXT: %j",context);

/*
  var body = JSON.parse(event.body);
  var name = body.item.message.from.name;
  var msg = body.item.message.message;
  var room = body.item.room.id;

  console.log("[BOT-COMMAND] %s: %s (%s)", name, msg, room);
*/
  //getHipchatPromise("Lambda API", "text", "yellow").then(
  //getRegions().then(
  //getAllInstances().then(
  getAllInstancesAsHtml().then(
          function(data){
              console.log("RESOLVE");

              var responseBody = {
                  message: data ,
                    color: "green",
                    notify: false,
                    message_format: "html"
                };
              var response = {
                    "statusCode": 200,
                    "headers": {
                        "x-custom-header" : "my custom header value"
                    },
                    "body": JSON.stringify(responseBody)
                };
              console.log("response: " + JSON.stringify(response));
              context.succeed(response);
          },
          function(err){
              console.log("REJECT");

   }).catch(function(err){
        console.log("CATCH", err);
   });


}

main()
