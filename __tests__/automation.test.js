const VPLEX = require('../lib/Automation_VPLEX');
const VMAX = require('../lib/Automation_VMAX')

TIMEOUT = 60 * 10 * 1000;   // 10 mins
   

describe("EMC VPLEX Automation Service", () => {
    var arrayInfo = VPLEX.GetArrayInfoObject("EMCCTEST");
    var clusternames = ['cluster-1','cluster-2'];
 

    describe('VPLEX.GetStorageVolumes', () => {
 
        clusternames.forEach((clustername) => {
            test('cluater='+clustername,(done) => {
                VPLEX.GetStorageVolumes(arrayInfo, clustername, function (result) {
                    console.log('======\n'+clustername +'\n' + JSON.stringify(result,2,2));
                    expect(result.code).toBe(200);
                    done();
                })
            })
        })
  
    });


    
    test("VPLEX.GetStorageArray", (done) => { 
        

        var cases = [
            ['1h', '2020-05-09T11:00:00.000+08:00'],
            ['1d', '2020-05-08T11:00:00.000+08:00'],
            ['1w', '2020-05-03T11:00:00.000+08:00'],
            ['2w', '2020-04-26T11:00:00.000+08:00'],
            ['1m', '2020-04-10T11:00:00.000+08:00'],
            ['', '2020-05-03T11:00:00.000+08:00']];

        test.each(cases)('%s', (type, res) => {
            config.load.mockReturnValue(configjson)
            expect(util.getConfStartTime(type)).toEqual(res);
        })


        VPLEX.GetStorageArray(arrayInfo, clustername, function (result) {
            console.log(result);
            expect(result.code).toBe(200);
            done();
        })

    })


})



describe("EMC VMAX Automation Service", () => {

    test("VMAX.CreateDevice", (done) => {

        var item = {
            "Step": "Create device and assign to sg [ MSCS_SG ] in pyhsical array [ 000297800193 ], arraytype= [ VMAX ]",
            "method": "CreatePhysicalDevice_VMAX",
            "arrayinfo": {
                "array_type": "VMAX",
                "serial_no": "000297800193",
                "password": "smc",
                "unispherehost": "10.121.0.204",
                "universion": "90",
                "user": "smc",
                "verifycert": false,
                "sgname": "EMC_TC1003_SG"
            },
            "DependOnAction": "N/A",
            "AsignSGName": "EMC_TC1003_SG",
            "StorageVolumeName": "EMC_TC1003_DEV",
            "capacityByte": 5368709120,
            "show": "false",
            "execute": true
        }

        var capacity = item.capacityByte / 1024 / 1024 / 1024;
        VMAX.CreateDevice(item.arrayinfo, item.AsignSGName, capacity, item.StorageVolumeName, function (result) {

            expect(result.code).toBe(200);
            done();

        })
    }, TIMEOUT )

})
 
 