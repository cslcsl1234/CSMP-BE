
const AUTO = require('../../lib/Automation');

describe("Automation Service", () => {

    var executeParamaters = [
        {
            "StepGroupName": "RPA Consistoncy Group Prod journal volume",
            "Step": "rediscover physical volume",
            "method": "ReDiscoverPhysicalArray",
            "arrayinfo": {
              "name": "EMCCTEST",
              "array_type": "VPLEX",
              "version": "5.5",
              "endpoint": "https://10.32.32.100/vplex",
              "auth": {
                "username": "service",
                "password": "password"
              }
            }
          },
          {
            "StepGroupName": "RPA Consistoncy Group Prod journal volume",
            "Step": "claim the pyhsical volume",
            "method": "ClaimPhysicalVolume",
            "arrayinfo": {
              "name": "EMCCTEST",
              "array_type": "VPLEX",
              "version": "5.5",
              "endpoint": "https://10.32.32.100/vplex",
              "auth": {
                "username": "service",
                "password": "password"
              }
            }
          }
    ]

    test("AUTO.ExecuteActions", (done) => {
        var ws;
        AUTO.ExecuteActions(executeParamaters, ws, function (result) {
            console.log(result);
            done();
        })
    },60000)


})