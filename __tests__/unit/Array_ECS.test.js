
const ECS = require('../../lib/Array_ECS');

describe("ECS", () => { 

    test("ECS.GetArrays", (done) => { 
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      var vdcname;
        ECS.GetArrays(vdcname,  function (result) {
            console.log(result);
            done();
        })
    },60000)


})