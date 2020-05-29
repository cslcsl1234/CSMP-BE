const FUNC = require('../../lib/automation/zeebe')


describe("ZeeBe Service", () => {

    test("ZeeBe.connect", async () => { 

        var zbc = await FUNC.connect(); 

    }, 20000)

})
