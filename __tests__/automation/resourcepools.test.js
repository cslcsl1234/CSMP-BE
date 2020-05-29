const ResourcePools = require('../../lib/automation/resourcepools')


describe("Storage Resource Pools", () => {

    test("ResourcePools.GetResourcePool", () => {

        var data = ResourcePools.GetResourcePool();
        expect(data.length).toBeGreaterThan(0);

    }, 20000)


    test("ResourcePools.ChoosePhysicalArray", () => {

        var resourcepool = {
            "name": "VMAX-高端资源池",
            "resourceLevel": "Gold",
            "resourceType": "VMAX",
            "TotalCapacity": 1234,
            "UsedCapacity": 567,
            "members": [
                {
                    "arrayname": "VMAX-0193",
                    "arraytype": "VMAX",
                    "capacity": 1000,
                    "info": {
                        "array_type": "VMAX",
                        "serial_no": "000297800193",
                        "password": "smc",
                        "unispherehost": "10.121.0.204",
                        "universion": "90",
                        "user": "smc",
                        "verifycert": false
                    }
                },
                {
                    "arrayname": "VMAX-0192",
                    "arraytype": "VMAX",
                    "capacity": 2000,
                    "info": {
                        "array_type": "VMAX",
                        "serial_no": "000297800192",
                        "password": "smc",
                        "unispherehost": "10.121.0.204",
                        "universion": "90",
                        "user": "smc",
                        "verifycert": false
                    }
                }
            ]
        }

        var data = ResourcePools.ChoosePhysicalArray(resourcepool);
        expect(data.arrayname).toBe("VMAX-0192");

    })

})
