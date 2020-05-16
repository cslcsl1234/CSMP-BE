
const VPLEX = require('../lib/Automation_VPLEX');
const AutoService = require('../lib/Automation');
const UNITY = require('../lib/Automation_UNITY');
const VMAX = require('../lib/Automation_VMAX');


describe("EMC VMAX Automation Service", () => {

    var arrayinfo = {
        "array_type": "VMAX",
        "serial_no": "000297800193",
        "password": "smc",
        "unispherehost": "10.121.0.204",
        "universion": "90",
        "user": "smc",
        "verifycert": false,
        "sgname": "MSCS_SG"
    };

    var request = {
        "appname": "APPNAME",
        "usedfor": "data",
        "capacity": 7,
        "count": 1,
        "StorageResourcePool": {
            "name": "VPLEX-高端",
            "resourceLevel": "Gold",
            "resourceType": "VPLEX",
            "TotalCapacity": 100,
            "UsedCapacity": 30,
            "members": [arrayinfo],
            "index": "0"
        },
        "ProtectLevel": {
            "DR_SameCity": "disable",
            "Backup": false,
            "AppVerification_SameCity": false,
            "AppVerification_DiffCity": false,
            "hostDeplpy": "SC"
        }
    }


    test("VMAX.GenerateVolName", () => {
        var item, item2, timestamp1;

        var timestamp = "0011223344";

        // case: paramater is null
        var volName = VMAX.GenerateVolName(item, item2, timestamp1);
        expect(volName).toBe(null);
 
        var volName = VMAX.GenerateVolName(arrayinfo, request, timestamp);
        
        console.log(`result=[${volName}]`);
        expect(volName).toBe("APPNAME_VMAX193_0011223344data");


    });

    test("VMAX.reateDevice", () => {

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
                "sgname": "MSCS_SG"
            },
            "DependOnAction": "N/A",
            "AsignSGName": "MSCS_SG",
            "StorageVolumeName": "ebankwebesxi_VMAX_193_data_1117145701_TEST02",
            "capacityByte": 5368709120,
            "show": "false",
            "execute": true
        }

        var capacity = item.capacityByte / 1024 / 1024 / 1024;
        var capacityBYTE = item.capacityByte;
        VMAX.CreateDevice(item.arrayinfo, item.AsignSGName, capacity, item.StorageVolumeName, function (result) {
            if (result.code != 200) {
                //console.log(result.code, `UNITY.CreateDevice is Fail! array=[${item.arrayinfo.unity_sn}] sgname=[${item.AsignSGName}] volname=[${item.StorageVolumeName}] capacity=[${capacity}(GB)] msg=[${result.msg}]`, AutoObject);
                var msg = result.data.msg.error.messages;
                console.log(msg)

                res.json(result.code, result);
            } else {
                console.log(result);
                //console.log(result.code, `UNITY.CreateDevice is succeedful. array=[${item.arrayinfo.unity_sn}] sgname=[${item.AsignSGName}] volname=[${item.StorageVolumeName}] capacity=[${capacity}(GB)]`, AutoObject);
                res.json(200, result);
            }

        })


    });

})

