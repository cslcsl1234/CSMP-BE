
const VPLEX = require('../lib/Automation_VPLEX');
const AUTO = require('../lib/Automation');

describe("EMC VPLEX Automation Service", () => {

    var arrayinfo = {
        "arrayname": "EMCCTEST1",
        "arraytype": "VPLEX",
        "info": {
            "name": "EMCCTEST",
            "type": "VPLEX",
            "version": "5.5",
            "endpoint": "https://10.32.32.100/vplex",
            "auth": {
                "username": "service",
                "password": "password"
            }
        },
        "backend-array": [
            {
                "array_type": "VMAX",
                "serial_no": "000297800193",
                "password": "smc",
                "unispherehost": "10.121.0.204",
                "universion": "90",
                "user": "smc",
                "verifycert": false,
                "sgname": "MSCS_SG"
            },
            {
                "array_type": "Unity",
                "unity_sn": "CKM00163300785",
                "unity_password": "P@ssw0rd",
                "unity_hostname": "10.32.32.64",
                "unity_pool_name": "jxl_vplex101_pool",
                "unity_username": "admin",
                "sgname": "VPLEX_101_BE"
            }
        ]
    };

    var request =
    {
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

    test("VPLEX.GenerateDeviceName", () => {
        var deviceNameParam = {
            appname: "appname",
            usedfor: "usedfor",
            provideType: "local",
            arrayname: "arrayname",
            totalcapacity: 1214
        }
        var devicename = VPLEX.GenerateDeviceName(deviceNameParam);
    })



    test("VPLEX.CreateDevice", () => {

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
        VPLEX.CreateDevice(item.arrayinfo, item.AsignSGName, capacity, item.StorageVolumeName, function (result) {
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

    test("VPLEX.CreateVirtualVolumeService", (done) => {

        var backend_array_1 = {
            "array_type": "VMAX",
            "serial_no": "000297800193",
            "password": "smc",
            "unispherehost": "10.121.0.204",
            "universion": "90",
            "user": "smc",
            "verifycert": false,
            "sgname": "MSCS_SG"
        };

        var backend_array_2 =  {
            "array_type":"Unity",
            "unity_sn":"67890",
            "unity_password":"P@ssw0rd",
            "unity_hostname":"10.32.32.64",
            "unity_pool_name":"jxl_vplex101_pool",
            "unity_username":"admin",
            "sgname":"VPLEX_101_BE"
        }; 
        var stepgroupname = 'CreateVirtualVolumeService TEST'
        var volName = "APPNAME_vplex_backend_data_01";
        var capacityGB = 20; 
        var clustername = 'cluster1';
        var sgname = "SGNAME";
        var cgname = "CGName";

        VPLEX.CreateVirtualVolumeService(stepgroupname, arrayinfo, backend_array_2, volName, capacityGB, clustername, sgname, cgname, function (code, result) {
            expect(code).toBe(200);
            expect(result.length).toBeGreaterThan(0);
            done();
        })
 
        var clustername1 = 'cluster111';  
        VPLEX.CreateVirtualVolumeService(stepgroupname, arrayinfo, backend_array_2, volName, capacityGB, clustername1, sgname, cgname, function (code, result) {
            expect(code).toBe(501); 
            expect(result).toBe("DataError: cluster111 is not 'cluster1' or 'cluster2'.");
            done();
        })
 
        var cgname1;
        VPLEX.CreateVirtualVolumeService(stepgroupname, arrayinfo, backend_array_2, volName, capacityGB, clustername, sgname, cgname1, function (code, result) {
            expect(code).toBe(200);  
            var isexist = false;
            result.forEach(item => {
                if ( item.method == 'AssignConsistencyGroup') isexist = true;
            })
            expect(isexist).toBe(false);
            done();
        })
        
        var sgname1;
        VPLEX.CreateVirtualVolumeService(stepgroupname, arrayinfo, backend_array_2, volName, capacityGB, clustername, sgname1, cgname, function (code, result) {
            expect(code).toBe(200);  
            var isexist = false;
            result.forEach(item => {
                if ( item.method == 'AssignStorageView') isexist = true;
            })
            expect(isexist).toBe(false);
            done();
        })

    }, 60000)


    test("CapacityProvisingServiceTEST", (done) => {
        var fs = require('fs');
        var autoobject = fs.readFileSync("c:\\autoobject.json");

        AUTO.CapacityProvisingServiceTEST(autoobject, function(result) {
            done();
        })
    })

})